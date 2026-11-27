import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { integrations, serverEnv } from "./env";

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service-role key. All tables have RLS
 * enabled with no public policies, so the database is reachable only through
 * this server code — never directly from the browser.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!integrations.database) return null;
  if (!client) {
    client = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
