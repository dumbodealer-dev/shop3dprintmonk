import { randomUUID, timingSafeEqual } from "node:crypto";
import { integrations, serverEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { json } from "@/lib/http";

/**
 * Setup diagnostics for the site owner. Open in a browser:
 *   https://YOUR-SITE/api/health?key=YOUR_CRON_SECRET          → checks everything
 *   https://YOUR-SITE/api/health?key=YOUR_CRON_SECRET&send=1   → also sends a test email
 * Shows which part fails and the exact error — never shows secret values.
 */
export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail?: string };

function keyOk(given: string | null) {
  const secret = serverEnv.cronSecret;
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const errText = (e: { code?: string; message?: string; details?: string | null; hint?: string | null } | null | undefined) =>
  e ? [e.code, e.message, e.details, e.hint].filter(Boolean).join(" — ") : undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!keyOk(bearer ?? url.searchParams.get("key"))) return json({ error: "Send Authorization: Bearer <CRON_SECRET> (or ?key=… from a browser). CRON_SECRET must be set in your hosting environment variables." }, 401);

  const checks: Record<string, Check> = {};
  const fromAddress = serverEnv.emailFrom;
  const fromDomain = fromAddress.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? "";

  checks.env = {
    ok: integrations.database && integrations.email,
    detail: JSON.stringify({
      NEXT_PUBLIC_SUPABASE_URL: Boolean(serverEnv.supabaseUrl),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(serverEnv.supabaseServiceRoleKey),
      RESEND_API_KEY: Boolean(serverEnv.resendApiKey),
      EMAIL_FROM: fromAddress || "(missing)",
      BUSINESS_NOTIFICATION_EMAIL: serverEnv.businessNotificationEmails.length ? serverEnv.businessNotificationEmails : "(missing or invalid)",
      IP_HASH_SALT: Boolean(serverEnv.ipHashSalt),
    }),
  };

  const db = getSupabaseAdmin();
  if (db) {
    for (const table of ["enquiries", "enquiry_files", "contact_messages", "materials"]) {
      const { error, count } = await db.from(table).select("id", { count: "exact", head: true });
      checks[`table:${table}`] = error ? { ok: false, detail: errText(error) ?? "error" } : { ok: true, detail: `${count ?? 0} rows` };
    }
    const cols = await db.from("enquiries").select("quote_mode, estimate_min_inr, estimate_details").limit(1);
    checks["enquiries:v2-columns"] = cols.error ? { ok: false, detail: `${errText(cols.error)} → re-run supabase/schema.sql` } : { ok: true };

    // Trial save exactly like a real enquiry, then delete it again.
    const ref = `TEST-${randomUUID().slice(0, 8)}`;
    const ins = await db
      .from("enquiries")
      .insert({
        reference: ref, enquiry_type: "quote", full_name: "Health check", email: "health@example.com", phone: "+910000000000",
        city: "Test", customer_type: "other", project_title: "Health check", technology: "fdm", quantity: 1,
        finishing: [], design_inputs: [], needs_design: false, permission_confirmed: false,
        quote_mode: "manual", estimate_details: { test: true },
      })
      .select("id")
      .single();
    if (ins.error) checks["enquiries:trial-save"] = { ok: false, detail: errText(ins.error) };
    else {
      await db.from("enquiries").delete().eq("id", ins.data.id);
      checks["enquiries:trial-save"] = { ok: true, detail: "insert + delete worked" };
    }

    const bucket = await db.storage.getBucket(serverEnv.quoteBucket);
    checks["storage:bucket"] = bucket.error
      ? { ok: false, detail: bucket.error.message }
      : { ok: !bucket.data.public, detail: bucket.data.public ? "bucket is PUBLIC — should be private" : `private, size limit: ${bucket.data.file_size_limit ?? "project default"}` };
  } else {
    checks.database = { ok: false, detail: "Supabase env vars missing" };
  }

  if (serverEnv.resendApiKey) {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${serverEnv.resendApiKey}` } }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { data?: { name: string; status: string }[]; message?: string; name?: string }) : null;
    if (!res) checks["resend:domains"] = { ok: false, detail: "Could not reach Resend" };
    else if (!res.ok) checks["resend:domains"] = { ok: true, detail: `Can't list domains with this key (${body?.message ?? res.status}) — normal for "sending access" keys. Use &send=1 to test sending.` };
    else {
      const domains = body?.data ?? [];
      const match = domains.find((d) => d.name.toLowerCase() === fromDomain);
      checks["resend:domains"] = {
        ok: match?.status === "verified",
        detail: `EMAIL_FROM domain "${fromDomain}": ${match ? match.status : "NOT ADDED in Resend"} · all domains: ${domains.map((d) => `${d.name}=${d.status}`).join(", ") || "none"}`,
      };
    }

    if (url.searchParams.get("send") === "1" && serverEnv.businessNotificationEmails.length) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${serverEnv.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddress, to: serverEnv.businessNotificationEmails, subject: "3D PRINTMONK test email", text: "If you can read this, email notifications work." }),
      }).catch(() => null);
      const rb = r ? ((await r.json().catch(() => ({}))) as { id?: string; message?: string }) : null;
      checks["resend:test-email"] = r?.ok ? { ok: true, detail: `sent to ${serverEnv.businessNotificationEmails.join(", ")} (id ${rb?.id})` } : { ok: false, detail: rb?.message ?? `HTTP ${r?.status ?? "network error"}` };
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return json({ allOk, checks });
}
