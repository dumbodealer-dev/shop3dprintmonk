import { authorised } from "@/lib/http";
import { db, shopConfigured } from "@/shop/server/db";
import { shopEnv } from "@/shop/server/env";
import { json } from "@/shop/server/http";
import { expireUnpaidOrders } from "@/shop/server/orders";

export const dynamic = "force-dynamic";

/**
 * Shop housekeeping — schedule every 15 minutes (Hostinger cron / cron-job.org):
 *   curl -s <SHOP_URL>/api/cron -H "Authorization: Bearer $CRON_SECRET"
 * Releases stock held by unpaid orders (after checking Razorpay for late payments)
 * and removes expired sessions, tokens and abandoned guest carts.
 */
export async function GET(req: Request) {
  if (!authorised(req.headers.get("authorization"), shopEnv.cronSecret)) return json({ error: "Unauthorised" }, 401);
  if (!shopConfigured()) return json({ error: "Database not configured" }, 503);
  const now = new Date().toISOString();
  const orders = await expireUnpaidOrders();
  await Promise.all([
    db().from("shop_customer_sessions").delete().lt("expires_at", now),
    db().from("shop_admin_sessions").delete().lt("expires_at", now),
    db().from("shop_auth_tokens").delete().lt("expires_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    db().from("shop_carts").delete().like("owner_key", "g:%").lt("updated_at", new Date(Date.now() - 90 * 86_400_000).toISOString()),
    db().from("shop_webhook_events").delete().lt("received_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);
  return json({ ok: true, ...orders });
}
