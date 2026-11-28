import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

export class ShopError extends Error {
  constructor(message: string, public status = 400, public code = "shop_error", public fields?: Record<string, string>) {
    super(message);
  }
}

export const shopConfigured = () => getSupabaseAdmin() !== null;

/** Server-only database client (service role). Throws a friendly error when Supabase isn't configured. */
export function db(): SupabaseClient {
  const c = getSupabaseAdmin();
  if (!c) throw new ShopError("The shop database is not configured yet.", 503, "not_configured");
  return c;
}

/** Unwraps a Supabase response, logging details server-side and throwing a generic error. */
export function must<T>(res: { data: T | null; error: { message: string; code?: string; details?: string | null } | null }, what: string): T {
  if (res.error) {
    console.error(`[shop] ${what} failed:`, res.error.code, res.error.message, res.error.details);
    throw new ShopError(`Something went wrong (${what}). Please try again.`, 500, "db_error");
  }
  return res.data as T;
}
