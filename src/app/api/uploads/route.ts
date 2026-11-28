import { randomUUID } from "node:crypto";
import { integrations, serverEnv, uploadLimits } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { allowedExtensions, extensionOf, sanitizeFileName } from "@/lib/files";
import { uploadRequestSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, json, readJson } from "@/lib/http";

/**
 * Issues a short-lived signed URL so the browser can upload one file directly
 * to the PRIVATE quote bucket. Files land in pending/<session>/ and are only
 * attached to an enquiry after server-side content checks in /api/quote.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  if (!integrations.database) {
    return json({ error: "File uploads are not configured yet. Please contact us directly." }, 503);
  }

  const ip = clientIp(request.headers);
  const rl = rateLimit(`upload:${ip}`, 40, 10 * 60_000);
  if (!rl.ok) return json({ error: "Too many uploads. Please wait a few minutes and try again." }, 429, { "Retry-After": String(rl.retryAfterSec) });

  let body;
  try {
    body = uploadRequestSchema.parse(await readJson(request, 4 * 1024));
  } catch {
    return json({ error: "Invalid upload request" }, 400);
  }

  const limits = uploadLimits();
  const ext = extensionOf(body.name);
  if (!allowedExtensions(body.allowReferences).includes(ext)) return json({ error: `.${ext || "?"} files are not accepted` }, 400);
  if (body.size > limits.maxFileBytes) return json({ error: `Files must be ${limits.maxFileMb} MB or smaller` }, 400);
  const db = getSupabaseAdmin()!;
  // The browser's own count is only a hint; the server counts what is really in this upload session.
  const { data: existing } = await db.storage.from(serverEnv.quoteBucket).list(`pending/${body.uploadSession}`, { limit: limits.maxFiles + 1 });
  if (Math.max(body.existingCount, existing?.length ?? 0) >= limits.maxFiles) return json({ error: `You can attach up to ${limits.maxFiles} files` }, 400);

  const path = `pending/${body.uploadSession}/${randomUUID()}-${sanitizeFileName(body.name)}`;
  const { data, error } = await db.storage.from(serverEnv.quoteBucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[uploads] signed URL failed:", error?.message);
    return json({ error: "Could not prepare the upload. Please try again." }, 502);
  }
  return json({ signedUrl: data.signedUrl, path });
}
