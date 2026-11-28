import { safeEqual } from "@/shop/server/auth/crypto";
import { shopEnv, shopIntegrations } from "@/shop/server/env";
import { json } from "@/shop/server/http";
import { parseTracking } from "@/shop/server/shipping/delhivery";
import { applyPushedResults, syncByAwbs } from "@/shop/server/shipping/tracking";

export const dynamic = "force-dynamic";

/**
 * Delhivery scan-push webhook (ask your Delhivery account manager to enable it):
 *   URL:    <NEXT_PUBLIC_SHOP_URL>/api/shipping/delhivery/webhook
 *   Auth:   header "Authorization: Bearer <DELHIVERY_WEBHOOK_SECRET>" (or x-webhook-token / ?token=)
 * The push is treated as a notification: when an API token is configured we re-fetch
 * the AWB from Delhivery's API instead of trusting the pushed body.
 */
export async function POST(req: Request) {
  const secret = shopEnv.delhivery.webhookSecret;
  if (!secret) return json({ error: "Webhook not configured" }, 503);
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-webhook-token") ?? url.searchParams.get("token") ?? "";
  if (!safeEqual(given, secret)) return json({ error: "Unauthorised" }, 401);

  const raw = await req.text();
  if (raw.length > 256 * 1024) return json({ error: "Too large" }, 413);
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const items = Array.isArray(payload) ? payload.flatMap((p) => parseTracking(p)) : parseTracking(payload);
  if (!items.length) return json({ ok: true, updated: 0 });
  try {
    const r = shopIntegrations.delhivery ? await syncByAwbs(items.map((i) => i.awb)) : await applyPushedResults(items);
    return json({ ok: true, ...r });
  } catch (e) {
    console.error("[shop] Delhivery webhook failed:", e);
    return json({ error: "processing failed" }, 500);
  }
}
