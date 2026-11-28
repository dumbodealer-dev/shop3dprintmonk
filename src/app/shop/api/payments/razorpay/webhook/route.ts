import { db } from "@/shop/server/db";
import { json } from "@/shop/server/http";
import { finalizePaidOrder, recordPaymentFailure } from "@/shop/server/orders";
import * as razorpay from "@/shop/server/payments/razorpay";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL:    <NEXT_PUBLIC_SHOP_URL>/api/payments/razorpay/webhook
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured, payment.failed, order.paid, refund.processed, refund.failed
 * Signed with HMAC-SHA256; each event id is processed once.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 512 * 1024) return json({ error: "too large" }, 413);
  if (!razorpay.verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) return json({ error: "invalid signature" }, 400);

  const event = JSON.parse(raw) as {
    event: string;
    payload: { payment?: { entity: razorpay.RazorpayPayment }; refund?: { entity: { id: string; payment_id: string; status: string; amount: number } } };
  };
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload.payment?.entity.id ?? event.payload.refund?.entity.id}`;
  const { error: dup } = await db().from("shop_webhook_events").insert({ id: eventId, provider: "razorpay", event: event.event, payload: event });
  if (dup?.code === "23505") return json({ ok: true, duplicate: true });

  try {
    const payment = event.payload.payment?.entity;
    if (payment?.order_id) {
      const { data: row } = await db().from("shop_payments").select("order_id").eq("provider_order_id", payment.order_id).maybeSingle();
      if (row) {
        if ((event.event === "payment.captured" || event.event === "order.paid") && payment.status === "captured")
          await finalizePaidOrder(row.order_id, { providerOrderId: payment.order_id, providerPaymentId: payment.id, amountPaise: payment.amount, method: payment.method, raw: payment });
        else if (event.event === "payment.failed") await recordPaymentFailure(row.order_id, payment);
      }
    }
    const refund = event.payload.refund?.entity;
    if (refund && (event.event === "refund.processed" || event.event === "refund.failed"))
      await db().from("shop_refunds").update({ status: event.event === "refund.processed" ? "processed" : "failed" }).eq("provider_refund_id", refund.id);
  } catch (e) {
    // Let Razorpay retry: forget the event id so the retry is processed.
    await db().from("shop_webhook_events").delete().eq("id", eventId);
    console.error("[shop] webhook processing failed:", e);
    return json({ error: "processing failed" }, 500);
  }
  return json({ ok: true });
}
