"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { shopHref } from "@/shop/config";
import { api, ApiError } from "../api";
import { payWithRazorpay } from "../checkout/razorpay";
import { useShop } from "../ShopProvider";

export function OrderActions({ orderNumber, accessKey, canPay, canCancel, canReorder }: { orderNumber: string; accessKey: string | null; canPay: boolean; canCancel: boolean; canReorder: boolean }) {
  const router = useRouter();
  const { setCart, setDrawerOpen } = useShop();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof ApiError ? e.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button type="button" disabled={!!busy} onClick={() => run("pay", async () => {
            const r = await api<{ payment: Parameters<typeof payWithRazorpay>[0] | null; redirect: string }>("/payments/razorpay/retry", { body: { orderNumber, key: accessKey } });
            if (!r.payment) return router.refresh();
            const out = await payWithRazorpay(r.payment);
            if (out.status === "paid") router.push(out.redirect);
            else if (out.status === "pending") setMsg({ tone: "ok", text: out.message });
            else setMsg({ tone: "err", text: "Payment was not completed." });
            router.refresh();
          })} className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-ink-950 hover:bg-accent-soft disabled:opacity-60">
            {busy === "pay" && <LoaderCircle className="h-4 w-4 animate-spin" />} Complete payment
          </button>
        )}
        {canReorder && (
          <button type="button" disabled={!!busy} onClick={() => run("reorder", async () => {
            const r = await api<{ cart: Parameters<typeof setCart>[0]; skipped: string[] }>("/account/orders/reorder", { body: { orderNumber, key: accessKey } });
            setCart(r.cart);
            if (r.skipped.length) setMsg({ tone: "err", text: `Some items couldn't be added: ${r.skipped.join(", ")}` });
            setDrawerOpen(true);
          })} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-5 font-semibold text-white hover:bg-ink-700 disabled:opacity-60">
            {busy === "reorder" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Buy again
          </button>
        )}
        {canCancel && (
          <button type="button" disabled={!!busy} onClick={() => {
            if (!confirm("Cancel this order? Any payment will be refunded to the original method.")) return;
            run("cancel", async () => {
              await api("/account/orders/cancel", { body: { orderNumber, key: accessKey } });
              setMsg({ tone: "ok", text: "Your order has been cancelled." });
              router.refresh();
            });
          }} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 font-semibold text-danger hover:bg-red-50 disabled:opacity-60">
            {busy === "cancel" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Cancel order
          </button>
        )}
      </div>
      {msg && <p role="status" className={`text-sm ${msg.tone === "ok" ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <noscript><a href={shopHref("/account/orders")}>Manage orders</a></noscript>
    </div>
  );
}
