import { integrations, serverEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authorised, json } from "@/lib/http";

/**
 * Deletes abandoned uploads (files uploaded but never submitted) older than 24 h.
 * Schedule daily, e.g. Hostinger cron / cron-job.org:
 *   curl -s https://www.3dprintmonk.com/api/cron/cleanup-uploads -H "Authorization: Bearer $CRON_SECRET"
 */
export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"), serverEnv.cronSecret)) return json({ error: "Unauthorised" }, 401);
  if (!integrations.database) return json({ error: "Database not configured" }, 503);

  const bucket = getSupabaseAdmin()!.storage.from(serverEnv.quoteBucket);
  const cutoff = Date.now() - 24 * 60 * 60_000;
  const { data: sessions, error } = await bucket.list("pending", { limit: 1000 });
  if (error) return json({ error: error.message }, 500);

  let removed = 0;
  for (const session of sessions ?? []) {
    const { data: files } = await bucket.list(`pending/${session.name}`, { limit: 100 });
    const candidates = (files ?? []).filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff).map((f) => `pending/${session.name}/${f.name}`);
    if (!candidates.length) continue;
    // If moving a file into its enquiry folder failed, the enquiry still points at pending/ — keep those.
    const { data: linked } = await getSupabaseAdmin()!.from("enquiry_files").select("storage_path").in("storage_path", candidates);
    const keep = new Set((linked ?? []).map((l) => l.storage_path));
    const stale = candidates.filter((p) => !keep.has(p));
    if (stale.length) {
      await bucket.remove(stale);
      removed += stale.length;
    }
  }
  return json({ removed });
}
