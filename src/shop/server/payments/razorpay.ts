import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../auth/crypto";
import { shopEnv } from "../env";

/**
 * Razorpay integration over its REST API (https://razorpay.com/docs/api).
 * Razorpay Checkout offers UPI, cards, net banking and wallets in one popup.
 * Card details never touch our servers.
 *
 * Trust model: the browser's "success" callback is NOT trusted on its own. We
 * (1) verify the HMAC signature with the key secret, then (2) fetch the payment
 * from Razorpay and check its status, order id and amount. Webhooks are verified
 * with the separate webhook secret and processed idempotently.
 */
const auth = () => "Basic " + Buffer.from(`${shopEnv.razorpay.keyId}:${shopEnv.razorpay.keySecret}`).toString("base64");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${shopEnv.razorpay.apiBase}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string; code?: string } };
  if (!res.ok) throw new Error(`Razorpay ${path} failed (${res.status}): ${data.error?.description ?? "unknown error"}`);
  return data;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RazorpayPayment = {
  id: string; order_id: string; amount: number; currency: string; status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string; captured: boolean; error_code?: string | null; error_description?: string | null; email?: string; contact?: string;
};

/** amountPaise must be an integer. `receipt` is our order number (max 40 chars). */
export function createOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  return api<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes, payment_capture: 1 }),
  });
}

export const fetchPayment = (paymentId: string) => api<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
export const fetchOrderPayments = (orderId: string) => api<{ items: RazorpayPayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`);

/** Captures an authorised payment (only needed if auto-capture is off in the Razorpay dashboard). */
export const capturePayment = (paymentId: string, amountPaise: number) =>
  api<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: "POST", body: JSON.stringify({ amount: amountPaise, currency: "INR" }) });

export const refundPayment = (paymentId: string, amountPaise: number, notes: Record<string, string>) =>
  api<{ id: string; status: string; amount: number }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount: amountPaise, speed: "normal", notes }),
  });

/** Checkout callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!shopEnv.razorpay.keySecret || !signature) return false;
  const expected = createHmac("sha256", shopEnv.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = shopEnv.razorpay.webhookSecret): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
