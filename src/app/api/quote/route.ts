import { integrations, serverEnv, uploadLimits } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { allowedExtensions, extensionOf, kindForExtension, sniffMatchesExtension } from "@/lib/files";
import { fieldErrors, quoteSubmissionSchema, type QuoteSubmission } from "@/lib/validation";
import { generateReference } from "@/lib/reference";
import { clientIp, hashIp, rateLimit } from "@/lib/rate-limit";
import { sendQuoteNotifications } from "@/lib/email";
import { isSameOrigin, json, readJson } from "@/lib/http";

const MIN_FILL_MS = 4_000; // humans don't complete a multi-step form in under 4 s
const DB_HOURLY_LIMIT = 8; // per IP hash

type VerifiedFile = { path: string; name: string; size: number; ext: string; kind: "model" | "reference" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  if (!integrations.database) {
    return json({ error: "Online enquiries are not configured yet. Please contact us by phone, WhatsApp or email." }, 503);
  }

  const ip = clientIp(request.headers);
  const ipHash = hashIp(ip);
  const rl = rateLimit(`quote:${ip}`, 5, 10 * 60_000);
  if (!rl.ok) return json({ error: "Too many submissions. Please wait a few minutes and try again." }, 429, { "Retry-After": String(rl.retryAfterSec) });

  // ── Validate ────────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const parsed = quoteSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, 422);
  }
  const q = parsed.data;
  if (q.website) return json({ error: "Submission rejected." }, 400); // honeypot
  if (Date.now() - q.startedAt < MIN_FILL_MS) return json({ error: "That was quick! Please review your details and submit again." }, 400);

  const db = getSupabaseAdmin()!;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await db.from("enquiries").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= DB_HOURLY_LIMIT) return json({ error: "We've received several enquiries from your network recently. Please contact us directly." }, 429);

  // ── Verify uploaded files on the server ────────────────────────────────
  const limits = uploadLimits();
  const allowReferences = q.needsDesign || q.enquiryType === "design";
  const unique = [...new Map(q.files.map((f) => [f.path, f])).values()];
  if (unique.length > limits.maxFiles) return json({ error: `You can attach up to ${limits.maxFiles} files.` }, 400);

  const verified: VerifiedFile[] = [];
  for (const f of unique) {
    const result = await verifyUpload(f, q.uploadSession, allowReferences, limits.maxFileBytes);
    if (!result.ok) {
      // Only ever delete files inside this submitter's own pending upload folder.
      if (ownsPendingPath(f.path, q.uploadSession)) await db.storage.from(serverEnv.quoteBucket).remove([f.path]).catch(() => {});
      return json({ error: `${f.name}: ${result.error} Please remove it and try again.` }, 400);
    }
    verified.push(result.file);
  }

  // ── Store the enquiry (primary record) ─────────────────────────────────
  let reference = "";
  let enquiryId = "";
  for (let attempt = 0; attempt < 4 && !enquiryId; attempt++) {
    reference = generateReference();
    const { data, error } = await db
      .from("enquiries")
      .insert(toRow(q, reference, ipHash, request.headers.get("user-agent")))
      .select("id")
      .single();
    if (data) enquiryId = data.id;
    else if (error?.code !== "23505") {
      console.error("[quote] insert failed:", error?.code, error?.message, error?.details, error?.hint);
      return json({ error: `We couldn't save your enquiry (error ${error?.code ?? "db"}). Please try again or contact us directly.` }, 500);
    }
  }
  if (!enquiryId) return json({ error: "We couldn't save your enquiry. Please try again." }, 500);

  // Move files out of pending/ into the enquiry folder and link them.
  const stored: { name: string; size: number; path: string }[] = [];
  for (const f of verified) {
    const finalPath = `enquiries/${reference}/${f.path.split("/").pop()}`;
    const { error } = await db.storage.from(serverEnv.quoteBucket).move(f.path, finalPath);
    const path = error ? f.path : finalPath;
    if (error) console.error("[quote] move failed, keeping pending path:", error.message);
    stored.push({ name: f.name, size: f.size, path });
    const { error: fileErr } = await db.from("enquiry_files").insert({
      enquiry_id: enquiryId,
      storage_path: path,
      original_name: f.name,
      size_bytes: f.size,
      extension: f.ext,
      kind: f.kind,
    });
    if (fileErr) console.error("[quote] file link failed:", fileErr.message);
  }

  // ── Notifications: the enquiry is already saved, so an email failure never loses it.
  // Awaited (not deferred) so it also completes on serverless hosts.
  await (async () => {
    const fileLinks = await Promise.all(
      stored.map(async (f) => {
        const { data } = await db.storage.from(serverEnv.quoteBucket).createSignedUrl(f.path, serverEnv.downloadLinkDays * 86_400, { download: f.name });
        return { name: f.name, size: f.size, url: data?.signedUrl ?? null };
      }),
    );
    const res = await sendQuoteNotifications({ reference, submission: q, fileLinks });
    const errors = [res.business, res.customer].filter((r) => !r.ok).map((r) => (r.ok ? "" : r.error));
    await db
      .from("enquiries")
      .update({
        email_business_status: res.business.ok ? "sent" : "failed",
        email_customer_status: res.customer.ok ? "sent" : "failed",
        email_error: errors.length ? errors.join(" | ").slice(0, 500) : null,
      })
      .eq("id", enquiryId);
    if (errors.length) console.error(`[quote] ${reference} email issue:`, errors.join(" | "));
  })().catch((err) => console.error(`[quote] ${reference} notification step failed:`, err));

  return json({ reference }, 201);
}

async function verifyUpload(
  f: { path: string; name: string; size: number },
  session: string,
  allowReferences: boolean,
  maxBytes: number,
): Promise<{ ok: true; file: VerifiedFile } | { ok: false; error: string }> {
  if (!ownsPendingPath(f.path, session)) return { ok: false, error: "invalid upload." };
  const ext = extensionOf(f.path);
  const kind = kindForExtension(ext);
  if (!kind || !allowedExtensions(allowReferences).includes(ext)) return { ok: false, error: "this file type is not accepted." };

  const db = getSupabaseAdmin()!;
  const { data: signed } = await db.storage.from(serverEnv.quoteBucket).createSignedUrl(f.path, 60);
  if (!signed?.signedUrl) return { ok: false, error: "the upload could not be found." };

  // Read only the first 4 KB to check the real file type.
  const res = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-4095" }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res || !res.ok) return { ok: false, error: "the upload could not be read." };
  const head = await readHead(res, 4096);
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? head.length);

  if (!Number.isFinite(total) || total <= 0) return { ok: false, error: "the file is empty." };
  if (total > maxBytes) return { ok: false, error: "the file is larger than allowed." };
  if (!sniffMatchesExtension(ext, head, total)) return { ok: false, error: `the content doesn't look like a valid .${ext} file.` };

  return { ok: true, file: { path: f.path, name: f.name.slice(0, 200), size: total, ext, kind } };
}

function ownsPendingPath(path: string, session: string) {
  return /^pending\/[0-9a-f-]{36}\/[\w.-]+$/i.test(path) && path.startsWith(`pending/${session}/`) && !path.includes("..");
}

/** Read at most `n` bytes, then cancel — safe even if the server ignores the Range header. */
async function readHead(res: Response, n: number): Promise<Uint8Array> {
  const out = new Uint8Array(n);
  let len = 0;
  const reader = res.body?.getReader();
  if (!reader) return out.slice(0, 0);
  while (len < n) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const take = Math.min(value.length, n - len);
    out.set(value.subarray(0, take), len);
    len += take;
  }
  await reader.cancel().catch(() => {});
  return out.slice(0, len);
}

function toRow(q: QuoteSubmission, reference: string, ipHash: string, userAgent: string | null) {
  return {
    reference,
    enquiry_type: q.enquiryType,
    full_name: q.customer.fullName,
    company: q.customer.company ?? null,
    email: q.customer.email,
    phone: q.customer.phone,
    city: q.customer.city,
    customer_type: q.customer.customerType,
    project_title: q.project.title,
    technology: q.project.technology,
    material: q.project.material ?? null,
    quantity: q.project.quantity,
    dimensions: q.project.dimensions ?? null,
    delivery_date: q.project.deliveryDate ?? null,
    application: q.project.application ?? null,
    finishing: q.project.finishing,
    design_inputs: q.designInputs,
    needs_design: q.needsDesign || q.enquiryType === "design",
    notes: q.project.notes ?? null,
    permission_confirmed: q.permissionConfirmed,
    quote_mode: q.estimate?.mode ?? "manual",
    estimate_min_inr: q.estimate?.mode === "instant" ? (q.estimate.low ?? null) : null,
    estimate_max_inr: q.estimate?.mode === "instant" ? (q.estimate.high ?? null) : null,
    estimate_details: q.estimate ?? null,
    ip_hash: ipHash,
    user_agent: userAgent?.slice(0, 300) ?? null,
  };
}
