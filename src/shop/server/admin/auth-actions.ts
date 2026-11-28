"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { shopHref } from "@/shop/config";
import { emailSchema, passwordSchema } from "@/shop/lib/validation";
import { adminCount, authenticateAdmin, createAdmin, createAdminResetToken, endAdminSession, resetAdminPassword, startAdminSession } from "../auth/admin";
import { safeEqual } from "../auth/crypto";
import { ShopError } from "../db";
import { shopEnv } from "../env";
import { sendPasswordReset } from "../notifications";

export type FormState = { error?: string; message?: string } | null;

async function limited(name: string, limit: number) {
  const ip = clientIp(await headers());
  if (!rateLimit(`shop-admin:${name}:${ip}`, limit, 15 * 60_000).ok) throw new ShopError("Too many attempts. Please wait 15 minutes.", 429);
}

export async function adminLogin(_: FormState, form: FormData): Promise<FormState> {
  try {
    await limited("login", 10);
    const email = emailSchema.parse(form.get("email"));
    const password = z.string().min(1).max(200).parse(form.get("password"));
    const admin = await authenticateAdmin(email, password);
    await startAdminSession(admin.id);
  } catch (e) {
    return { error: e instanceof ShopError ? e.message : "Enter a valid email and password." };
  }
  redirect(shopHref("/admin"));
}

export async function adminLogout() {
  await endAdminSession();
  redirect(shopHref("/admin/login"));
}

export async function adminForgot(_: FormState, form: FormData): Promise<FormState> {
  try {
    await limited("forgot", 5);
    const email = emailSchema.parse(form.get("email"));
    const r = await createAdminResetToken(email);
    if (r) await sendPasswordReset({ email: r.admin.email, fullName: r.admin.full_name }, r.token, "admin");
  } catch (e) {
    if (e instanceof ShopError) return { error: e.message };
  }
  return { message: "If that email belongs to an admin, a reset link is on its way (valid for 1 hour)." };
}

export async function adminReset(_: FormState, form: FormData): Promise<FormState> {
  try {
    await limited("reset", 10);
    const token = z.string().min(20).max(200).parse(form.get("token"));
    const password = passwordSchema.parse(form.get("password"));
    if (password !== form.get("confirm")) return { error: "The passwords don't match." };
    if (!(await resetAdminPassword(token, password))) return { error: "This link is invalid or has expired." };
  } catch (e) {
    return { error: e instanceof ShopError ? e.message : e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid input") : "Couldn't reset the password." };
  }
  redirect(shopHref("/admin/login?reset=1"));
}

/** One-time creation of the first owner account. Requires SHOP_ADMIN_SETUP_TOKEN and works only while no admin exists. */
export async function adminSetup(_: FormState, form: FormData): Promise<FormState> {
  try {
    await limited("setup", 5);
    if (!shopEnv.adminSetupToken) return { error: "Set SHOP_ADMIN_SETUP_TOKEN in the environment first." };
    if (!safeEqual(String(form.get("token") ?? ""), shopEnv.adminSetupToken)) return { error: "Setup token is incorrect." };
    if ((await adminCount()) > 0) return { error: "An admin account already exists. Sign in instead." };
    const email = emailSchema.parse(form.get("email"));
    const fullName = z.string().trim().min(2).max(120).parse(form.get("fullName"));
    const password = passwordSchema.parse(form.get("password"));
    const { id } = await createAdmin({ email, fullName, role: "owner", password });
    await startAdminSession(id);
  } catch (e) {
    return { error: e instanceof ShopError ? e.message : e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid input") : "Setup failed." };
  }
  redirect(shopHref("/admin"));
}
