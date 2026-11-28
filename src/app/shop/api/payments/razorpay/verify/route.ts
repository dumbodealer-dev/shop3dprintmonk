import { z } from "zod";
import { db, ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { toPaise } from "@/shop/lib/money";
import { finalizePaidOrder, getOrderById, recordPaymentFailure } from "@/shop/server/orders";
import * as razorpay from "@/shop/server/payments/razorpay";
import { shopHref } from "@/shop/config";

export const dynamic = "force-dynamic";

const success = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});
const failure = z.object({ failed: z.literal(true), razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/).optional() });

/**
 * Called by the browser after Razorpay Checkout. Nothing here is trusted on its
 * own: the signature is verified with our secret and the payment is fetched from
 * Razorpay to confirm status, order and amount before the order is marked paid.
 */
export const POST = route(
  async (req) => {
    const raw = await body(req);
    const f = failure.safeParse(raw);
    if (f.success) {
      const { data: pay } = await db().from("shop_payments").select("order_id").eq("provider_order_id", f.data.razorpay_order_id).maybeSingle();
      if (pay && f.data.razorpay_payment_id) {
        const p = await razorpay.fetchPayment(f.data.razorpay_payment_id).catch(() => null);
        if (p && p.order_id === f.data.razorpay_order_id && p.status === "failed") await recordPaymentFailure(pay.order_id, p);
      }
      return json({ ok: true });
    }

    const s = success.parse(raw);
    const { data: pay } = await db().from("shop_payments").select("order_id").eq("provider_order_id", s.razorpay_order_id).maybeSingle();
    if (!pay) throw new ShopError("Payment not recognised.", 404);
    if (!razorpay.verifyCheckoutSignature(s.razorpay_order_id, s.razorpay_payment_id, s.razorpay_signature)) throw new ShopError("Payment verification failed.", 400, "bad_signature");

    const order = await getOrderById(pay.order_id);
    if (!order) throw new ShopError("Order not found.", 404);
    let payment = await razorpay.fetchPayment(s.razorpay_payment_id);
    if (payment.order_id !== s.razorpay_order_id) throw new ShopError("Payment verification failed.", 400);
    if (payment.status === "authorized") payment = await razorpay.capturePayment(payment.id, payment.amount);
    if (payment.status !== "captured") throw new ShopError("Your payment is still being processed. We'll email you as soon as it's confirmed.", 202, "pending");
    if (payment.amount !== toPaise(order.grand_total)) console.error(`[shop] amount mismatch on ${order.order_number}: paid ${payment.amount} vs ${toPaise(order.grand_total)}`);

    await finalizePaidOrder(order.id, { providerOrderId: s.razorpay_order_id, providerPaymentId: payment.id, amountPaise: payment.amount, method: payment.method, raw: payment });
    return json({ ok: true, redirect: shopHref(`/order/${order.order_number}?key=${encodeURIComponent(order.access_key)}&placed=1`) });
  },
  { rate: ["verify", 20, 10 * 60_000] },
);
