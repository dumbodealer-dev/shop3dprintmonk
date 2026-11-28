"use client";

import { api } from "../api";

/** Opens Razorpay Checkout (UPI, cards, net banking, wallets) and reports the result to our server for verification. */
type PaymentInfo = { keyId: string; orderId: string; amount: number; currency: "INR"; name: string; description: string; prefill: { name: string; email: string; contact: string } };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { metadata?: { order_id?: string; payment_id?: string }; description?: string } }) => void) => void };
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PayOutcome = { status: "paid"; redirect: string } | { status: "dismissed" } | { status: "failed"; message: string } | { status: "pending"; message: string };

export async function payWithRazorpay(p: PaymentInfo): Promise<PayOutcome> {
  await loadScript();
  return new Promise((resolve) => {
    let settled = false;
    const done = (o: PayOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };
    const rzp = new window.Razorpay!({
      key: p.keyId,
      order_id: p.orderId,
      amount: p.amount,
      currency: p.currency,
      name: p.name,
      description: p.description,
      prefill: p.prefill,
      theme: { color: "#ff6a13" },
      retry: { enabled: true, max_count: 3 },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const v = await api<{ redirect?: string; error?: string }>("/payments/razorpay/verify", { body: r });
          if (v.redirect) done({ status: "paid", redirect: v.redirect });
          else done({ status: "pending", message: v.error ?? "Your payment is being confirmed. We'll email you shortly." });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "We couldn't confirm your payment yet.";
          done({ status: "pending", message: msg });
        }
      },
      modal: { ondismiss: () => done({ status: "dismissed" }), confirm_close: true },
    });
    rzp.on("payment.failed", (r) => {
      const meta = r.error?.metadata;
      if (meta?.order_id) api("/payments/razorpay/verify", { body: { failed: true, razorpay_order_id: meta.order_id, razorpay_payment_id: meta.payment_id } }).catch(() => {});
      // Razorpay lets the customer retry inside the same window; we only resolve if they close it.
    });
    rzp.open();
  });
}
