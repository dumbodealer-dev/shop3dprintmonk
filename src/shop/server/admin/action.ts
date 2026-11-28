import "server-only";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { fieldErrors } from "@/shop/lib/validation";
import { SHOP_ROUTE } from "@/shop/config";
import { assertAdmin, audit, type Admin, type Permission } from "../auth/admin";
import { ShopError } from "../db";

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string; fields?: Record<string, string> };

/**
 * Every admin mutation goes through this wrapper: it re-authenticates the admin
 * session and checks the role's permission on the server (never trusting the
 * UI), turns validation errors into field messages and writes an audit entry.
 */
export async function adminAction<T>(perm: Permission, name: string, fn: (admin: Admin) => Promise<{ message?: string; data?: T; entity?: string; entityId?: string; details?: unknown } | void>): Promise<ActionResult<T>> {
  try {
    const admin = await assertAdmin(perm);
    const r = (await fn(admin)) ?? {};
    await audit(admin.id, name, r.entity, r.entityId, r.details);
    return { ok: true, message: r.message, data: r.data };
  } catch (e) {
    if (e instanceof ShopError) return { ok: false, error: e.message, fields: e.fields };
    if (e instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(e) };
    console.error(`[shop admin] ${name} failed:`, e);
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Refresh every cached storefront page after catalogue / content changes. */
export const revalidateStore = () => revalidatePath(SHOP_ROUTE, "layout");
