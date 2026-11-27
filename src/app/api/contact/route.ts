import { integrations } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { clientIp, hashIp, rateLimit } from "@/lib/rate-limit";
import { sendContactNotification } from "@/lib/email";
import { isSameOrigin, json, readJson } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Invalid origin" }, 403);
  if (!integrations.database) return json({ error: "The contact form is not configured yet. Please call, email or WhatsApp us." }, 503);

  const ip = clientIp(request.headers);
  const rl = rateLimit(`contact:${ip}`, 5, 10 * 60_000);
  if (!rl.ok) return json({ error: "Too many messages. Please try again later." }, 429);

  let raw: unknown;
  try {
    raw = await readJson(request, 16 * 1024);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, 422);
  const msg = parsed.data;
  if (msg.website || Date.now() - msg.startedAt < 3_000) return json({ error: "Submission rejected." }, 400);

  const db = getSupabaseAdmin()!;
  const { data, error } = await db
    .from("contact_messages")
    .insert({ name: msg.name, email: msg.email, phone: msg.phone ?? null, subject: msg.subject ?? null, message: msg.message, ip_hash: hashIp(ip) })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[contact] insert failed:", error?.code, error?.message, error?.details, error?.hint);
    return json({ error: `We couldn't send your message (error ${error?.code ?? "db"}). Please try again or contact us directly.` }, 500);
  }

  // Awaited so it completes on serverless hosts; the message is already saved.
  await (async () => {
    const res = await sendContactNotification(msg);
    await db.from("contact_messages").update({ email_status: res.ok ? "sent" : `failed: ${res.error}`.slice(0, 300) }).eq("id", data.id);
  })().catch((err) => console.error("[contact] email step failed:", err));

  return json({ ok: true }, 201);
}
