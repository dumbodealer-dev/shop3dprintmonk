import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp, hashIp } from "@/lib/rate-limit";
import { shopHref } from "@/shop/config";
import { db, must, ShopError, shopConfigured } from "../db";
import { shopEnv } from "../env";
import { DUMMY_HASH, hashPassword, randomToken, sha256, verifyPassword } from "./crypto";
import { consumeToken, issueToken } from "./tokens";

/**
 * Admin authentication is completely separate from customer accounts: its own
 * table, cookie, shorter sessions and role-based permissions. Every admin page
 * AND every admin action/route re-checks the session server-side, so changing a
 * URL or editing browser data can never grant access.
 */
export const ADMIN_COOKIE = "pm_shop_admin";
const SESSION_HOURS = 12;
const IDLE_MINUTES = 120;

export const ROLES = ["owner", "manager", "staff"] as const;
export type AdminRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard", "products", "orders", "refunds", "customers", "inventory", "discounts", "content", "reviews", "settings", "team",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: ["dashboard", "products", "orders", "refunds", "customers", "inventory", "discounts", "content", "reviews"],
  staff: ["dashboard", "products", "orders", "inventory", "reviews"],
};

export const can = (role: AdminRole, perm: Permission) => ROLE_PERMISSIONS[role]?.includes(perm) ?? false;

export type Admin = { id: string; email: string; fullName: string; role: AdminRole; sessionId: string };

export const getAdmin = cache(async (): Promise<Admin | null> => {
  if (!shopConfigured()) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const { data } = await db()
    .from("shop_admin_sessions")
    .select("id, expires_at, last_seen_at, admin:shop_admins (id, email, full_name, role, status)")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  const row = data as unknown as { id: string; expires_at: string; last_seen_at: string; admin: { id: string; email: string; full_name: string; role: AdminRole; status: string } | null } | null;
  if (!row?.admin || row.admin.status !== "active") return null;
  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now || now - new Date(row.last_seen_at).getTime() > IDLE_MINUTES * 60_000) {
    await db().from("shop_admin_sessions").delete().eq("id", row.id);
    return null;
  }
  // Sliding idle timeout (cheap: at most one write per minute).
  if (now - new Date(row.last_seen_at).getTime() > 60_000) await db().from("shop_admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", row.id);
  return { id: row.admin.id, email: row.admin.email, fullName: row.admin.full_name, role: row.admin.role, sessionId: row.id };
});

/** For admin pages: redirects to the login (or dashboard if the role lacks the permission). */
export async function requireAdminPage(perm: Permission = "dashboard"): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect(shopHref("/admin/login"));
  if (!can(admin.role, perm)) redirect(shopHref("/admin?denied=1"));
  return admin;
}

/** For admin server actions and route handlers: throws instead of redirecting. */
export async function assertAdmin(perm: Permission): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new ShopError("Your admin session has expired. Please sign in again.", 401, "unauthenticated");
  if (!can(admin.role, perm)) throw new ShopError("You don't have permission to do that.", 403, "forbidden");
  return admin;
}

export async function startAdminSession(adminId: string) {
  const token = randomToken();
  const h = await headers();
  const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  must(
    await db().from("shop_admin_sessions").insert({
      admin_id: adminId,
      token_hash: sha256(token),
      expires_at: expires.toISOString(),
      user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
      ip_hash: hashIp(clientIp(h)),
    }),
    "admin session",
  );
  // Host-only, strict cookie: never shared with other subdomains, never sent cross-site.
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, secure: shopEnv.isProd, sameSite: "strict", path: "/", expires });
  await db().from("shop_admins").update({ last_login_at: new Date().toISOString() }).eq("id", adminId);
}

export async function endAdminSession() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await db().from("shop_admin_sessions").delete().eq("token_hash", sha256(token));
  store.set(ADMIN_COOKIE, "", { httpOnly: true, secure: shopEnv.isProd, sameSite: "strict", path: "/", maxAge: 0 });
}

type AdminRow = { id: string; email: string; full_name: string; role: AdminRole; status: string; password_hash: string; failed_logins: number; locked_until: string | null };

export async function authenticateAdmin(email: string, password: string) {
  const { data } = await db().from("shop_admins").select("id, email, full_name, role, status, password_hash, failed_logins, locked_until").eq("email", email.trim().toLowerCase()).maybeSingle();
  const row = data as AdminRow | null;
  if (!row) {
    await verifyPassword(password, DUMMY_HASH);
    throw new ShopError("Incorrect email or password.", 401);
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) throw new ShopError("Account temporarily locked after failed attempts. Try again in 30 minutes or reset your password.", 429);
  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    await db()
      .from("shop_admins")
      .update({ failed_logins: failed >= 5 ? 0 : failed, locked_until: failed >= 5 ? new Date(Date.now() + 30 * 60_000).toISOString() : null })
      .eq("id", row.id);
    await audit(null, "admin.login_failed", "admin", row.id);
    throw new ShopError("Incorrect email or password.", 401);
  }
  if (row.status !== "active") throw new ShopError("This admin account is disabled.", 403);
  await db().from("shop_admins").update({ failed_logins: 0, locked_until: null }).eq("id", row.id);
  await audit(row.id, "admin.login", "admin", row.id);
  return row;
}

export async function adminCount() {
  const { count } = await db().from("shop_admins").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function createAdmin(input: { email: string; fullName: string; role: AdminRole; password: string }) {
  const { data, error } = await db()
    .from("shop_admins")
    .insert({ email: input.email.trim().toLowerCase(), full_name: input.fullName, role: input.role, password_hash: await hashPassword(input.password) })
    .select("id")
    .single();
  if (error?.code === "23505") throw new ShopError("An admin with this email already exists.", 409);
  return must({ data, error }, "create admin");
}

export async function createAdminResetToken(email: string) {
  const { data } = await db().from("shop_admins").select("id, email, full_name, status").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (!data || data.status !== "active") return null;
  return { admin: data, token: await issueToken("admin", data.id, "reset_password") };
}

export async function resetAdminPassword(token: string, password: string) {
  const id = await consumeToken("admin", "reset_password", token);
  if (!id) return false;
  await db().from("shop_admins").update({ password_hash: await hashPassword(password), failed_logins: 0, locked_until: null }).eq("id", id);
  await db().from("shop_admin_sessions").delete().eq("admin_id", id);
  await audit(id, "admin.password_reset", "admin", id);
  return true;
}

export async function audit(adminId: string | null, action: string, entity?: string, entityId?: string, details?: unknown) {
  await db()
    .from("shop_admin_audit")
    .insert({ admin_id: adminId, action, entity: entity ?? null, entity_id: entityId ?? null, details: details ?? null })
    .then(({ error }) => error && console.error("[shop] audit failed:", error.message));
}
