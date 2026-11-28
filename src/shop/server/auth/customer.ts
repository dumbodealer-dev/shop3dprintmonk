import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { clientIp, hashIp } from "@/lib/rate-limit";
import { normalizeIndianMobile } from "@/shop/lib/india";
import { db, must, ShopError, shopConfigured } from "../db";
import { shopEnv } from "../env";
import { DUMMY_HASH, hashPassword, randomToken, sha256, verifyPassword } from "./crypto";
import { consumeToken, issueToken } from "./tokens";

export { CUSTOMER_COOKIE } from "@/shop/cookies";
import { CUSTOMER_COOKIE } from "@/shop/cookies";
const SESSION_DAYS = 30;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type Customer = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerified: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  deletionRequestedAt: string | null;
};

type CustomerRow = {
  id: string; email: string; full_name: string; phone: string | null; email_verified_at: string | null;
  marketing_opt_in: boolean; created_at: string; status: string; deletion_requested_at: string | null;
};

const toCustomer = (r: CustomerRow): Customer => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  phone: r.phone,
  emailVerified: !!r.email_verified_at,
  marketingOptIn: r.marketing_opt_in,
  createdAt: r.created_at,
  deletionRequestedAt: r.deletion_requested_at,
});

const CUSTOMER_COLS = "id, email, full_name, phone, email_verified_at, marketing_opt_in, created_at, status, deletion_requested_at";

/** The signed-in customer for this request, or null. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  if (!shopConfigured()) return null;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const { data } = await db()
    .from("shop_customer_sessions")
    .select(`id, expires_at, customer:shop_customers (${CUSTOMER_COLS})`)
    .eq("token_hash", sha256(token))
    .maybeSingle();
  const row = data as unknown as { id: string; expires_at: string; customer: CustomerRow | null } | null;
  if (!row?.customer || new Date(row.expires_at) < new Date() || row.customer.status !== "active") return null;
  return toCustomer(row.customer);
});

export async function requireCustomer(): Promise<Customer> {
  const c = await getCustomer();
  if (!c) throw new ShopError("Please sign in to continue.", 401, "unauthenticated");
  return c;
}

export async function startCustomerSession(customerId: string) {
  const token = randomToken();
  const h = await headers();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  must(
    await db().from("shop_customer_sessions").insert({
      customer_id: customerId,
      token_hash: sha256(token),
      expires_at: expires.toISOString(),
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
      ip_hash: hashIp(clientIp(h)),
    }),
    "create session",
  );
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: shopEnv.isProd,
    sameSite: "lax",
    path: "/",
    expires,
    domain: shopEnv.cookieDomain,
  });
  await db().from("shop_customers").update({ last_login_at: new Date().toISOString() }).eq("id", customerId);
}

export async function endCustomerSession() {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token) await db().from("shop_customer_sessions").delete().eq("token_hash", sha256(token));
  store.set(CUSTOMER_COOKIE, "", { httpOnly: true, secure: shopEnv.isProd, sameSite: "lax", path: "/", maxAge: 0, domain: shopEnv.cookieDomain });
}

export async function findCustomerByEmail(email: string) {
  const { data } = await db().from("shop_customers").select(`${CUSTOMER_COLS}, password_hash, failed_logins, locked_until`).eq("email", email.trim().toLowerCase()).maybeSingle();
  return data as (CustomerRow & { password_hash: string; failed_logins: number; locked_until: string | null }) | null;
}

export async function registerCustomer(input: { fullName: string; email: string; phone?: string; password: string; marketingOptIn: boolean }) {
  const existing = await findCustomerByEmail(input.email);
  if (existing) throw new ShopError("An account with this email already exists. Sign in or reset your password.", 409, "exists", { email: "Already registered" });
  const { data, error } = await db()
    .from("shop_customers")
    .insert({
      email: input.email,
      full_name: input.fullName,
      phone: input.phone ? normalizeIndianMobile(input.phone) : null,
      password_hash: await hashPassword(input.password),
      marketing_opt_in: input.marketingOptIn,
    })
    .select(CUSTOMER_COLS)
    .single();
  if (error?.code === "23505") throw new ShopError("An account with this email already exists.", 409, "exists");
  const customer = toCustomer(must({ data, error }, "register") as CustomerRow);
  const token = await issueToken("customer", customer.id, "verify_email");
  return { customer, verifyToken: token };
}

/** Verifies credentials with lockout after repeated failures. Generic error messages avoid revealing which emails exist. */
export async function authenticateCustomer(email: string, password: string): Promise<Customer> {
  const row = await findCustomerByEmail(email);
  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    throw new ShopError("Incorrect email or password.", 401, "invalid_credentials");
  }
  if (row.locked_until && new Date(row.locked_until) > new Date())
    throw new ShopError("Too many attempts. Please wait 15 minutes or reset your password.", 429, "locked");
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    const failed = row.failed_logins + 1;
    await db()
      .from("shop_customers")
      .update({ failed_logins: failed >= MAX_FAILED ? 0 : failed, locked_until: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null })
      .eq("id", row.id);
    throw new ShopError("Incorrect email or password.", 401, "invalid_credentials");
  }
  if (row.status !== "active") throw new ShopError("This account is not active. Please contact support.", 403, "inactive");
  if (row.failed_logins || row.locked_until) await db().from("shop_customers").update({ failed_logins: 0, locked_until: null }).eq("id", row.id);
  return toCustomer(row);
}

export async function verifyCustomerEmail(token: string): Promise<boolean> {
  const id = await consumeToken("customer", "verify_email", token);
  if (!id) return false;
  await db().from("shop_customers").update({ email_verified_at: new Date().toISOString() }).eq("id", id).is("email_verified_at", null);
  return true;
}

export async function createPasswordResetToken(email: string) {
  const row = await findCustomerByEmail(email);
  if (!row || row.status !== "active") return null;
  return { customer: toCustomer(row), token: await issueToken("customer", row.id, "reset_password") };
}

/** Sets a new password and signs out every device. */
export async function resetCustomerPassword(token: string, password: string): Promise<string | null> {
  const id = await consumeToken("customer", "reset_password", token);
  if (!id) return null;
  await db()
    .from("shop_customers")
    .update({ password_hash: await hashPassword(password), failed_logins: 0, locked_until: null, email_verified_at: new Date().toISOString() })
    .eq("id", id);
  await db().from("shop_customer_sessions").delete().eq("customer_id", id);
  return id;
}

export async function changeCustomerPassword(customerId: string, current: string, next: string) {
  const { data } = await db().from("shop_customers").select("password_hash").eq("id", customerId).single();
  if (!data || !(await verifyPassword(current, data.password_hash))) throw new ShopError("Your current password is incorrect.", 400, "bad_password", { current: "Incorrect password" });
  await db().from("shop_customers").update({ password_hash: await hashPassword(next) }).eq("id", customerId);
  // Keep this device signed in, end every other session.
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  await db().from("shop_customer_sessions").delete().eq("customer_id", customerId).neq("token_hash", token ? sha256(token) : "");
}
