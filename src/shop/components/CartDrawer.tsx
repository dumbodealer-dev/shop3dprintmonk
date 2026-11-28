"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import type { PublicCart } from "@/shop/server/serialize";
import { api, ApiError } from "./api";
import { useShop } from "./ShopProvider";
import { ProductPlaceholder } from "./ui";

export function QuantityStepper({ value, max, onChange, disabled, size = "md", label = "Quantity" }: { value: number; max?: number | null; onChange: (v: number) => void; disabled?: boolean; size?: "sm" | "md"; label?: string }) {
  const h = size === "sm" ? "h-9" : "h-11";
  const limit = Math.max(1, max ?? 99);
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-line bg-white`} role="group" aria-label={label}>
      <button type="button" className={`${h} w-9 rounded-l-full text-muted hover:text-text disabled:opacity-40`} onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled || value <= 1} aria-label="Decrease quantity">
        <Minus className="mx-auto h-4 w-4" />
      </button>
      <input
        className="w-10 bg-transparent text-center text-sm font-semibold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        type="number"
        inputMode="numeric"
        min={1}
        max={limit}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n) && n >= 1) onChange(Math.min(n, limit));
        }}
      />
      <button type="button" className={`${h} w-9 rounded-r-full text-muted hover:text-text disabled:opacity-40`} onClick={() => onChange(Math.min(limit, value + 1))} disabled={disabled || value >= limit} aria-label="Increase quantity">
        <Plus className="mx-auto h-4 w-4" />
      </button>
    </div>
  );
}

export function useCartMutations() {
  const { setCart, toast } = useShop();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(itemId: string, body: Record<string, unknown>) {
    setBusy(itemId);
    try {
      setCart(await api<PublicCart>("/cart", { method: "PATCH", body: { itemId, ...body } }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't update your cart.", "error");
    } finally {
      setBusy(null);
    }
  }
  return {
    busy,
    setQty: (id: string, quantity: number) => run(id, { quantity }),
    remove: (id: string) => run(id, { quantity: 0 }),
    saveForLater: (id: string, savedForLater: boolean) => run(id, { savedForLater }),
  };
}

export function FreeShippingMeter({ cart }: { cart: PublicCart }) {
  const t = cart.totals;
  if (!cart.lines.length) return null;
  if (t.shippingFreeReason)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
        <Truck className="h-4 w-4" /> You&apos;ve unlocked free shipping
      </p>
    );
  if (t.amountForFreeShipping == null || t.amountForFreeShipping <= 0) return null;
  const goal = t.subtotal - t.discountTotal + t.amountForFreeShipping;
  const pct = Math.min(100, Math.round(((t.subtotal - t.discountTotal) / goal) * 100));
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Truck className="h-4 w-4 text-accent-ink" /> Add {formatINR(t.amountForFreeShipping)} more for free shipping
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
        <div className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen } = useShop();
  const { busy, setQty, remove } = useCartMutations();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;
  const lines = cart?.lines ?? [];
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" aria-label="Close cart" onClick={() => setDrawerOpen(false)} />
      <div ref={panel} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-md animate-rise flex-col bg-white shadow-2xl focus:outline-none">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">Your cart {cart?.itemCount ? <span className="text-muted">({cart.itemCount})</span> : null}</h2>
          <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-full p-2 hover:bg-paper" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-ink-300" />
            <p className="mt-4 font-semibold">Your cart is empty</p>
            <Link href={shopHref("/products")} onClick={() => setDrawerOpen(false)} className="mt-5 inline-flex h-11 items-center rounded-full bg-ink-900 px-6 font-semibold text-white hover:bg-ink-700">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {cart && <FreeShippingMeter cart={cart} />}
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <li key={l.id} className={`flex gap-3 py-4 ${busy === l.id ? "opacity-60" : ""}`}>
                    <Link href={shopHref(`/products/${l.slug}`)} onClick={() => setDrawerOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line">
                      {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="80px" className="object-cover" /> : <ProductPlaceholder name={l.name} className="h-full w-full" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{l.name}</p>
                      {l.variantTitle && <p className="text-xs text-muted">{l.variantTitle}</p>}
                      {l.customizationLabels.map((c) => (
                        <p key={c.label} className="truncate text-xs text-muted">{c.label}: {c.value}</p>
                      ))}
                      {l.issue && <p className="mt-1 text-xs font-medium text-danger">{l.issue}</p>}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <QuantityStepper size="sm" value={l.quantity} max={l.maxQuantity} disabled={busy === l.id} onChange={(q) => setQty(l.id, q)} />
                        <span className="text-sm font-bold">{formatINR(l.lineTotal)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => remove(l.id)} className="self-start rounded-full p-1.5 text-muted hover:bg-paper hover:text-danger" aria-label={`Remove ${l.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold">{formatINR(cart!.totals.subtotal - cart!.totals.discountTotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Incl. GST. Shipping calculated at checkout.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={shopHref("/cart")} onClick={() => setDrawerOpen(false)} className="inline-flex h-12 items-center justify-center rounded-full border border-line font-semibold hover:bg-paper">
                  View cart
                </Link>
                <Link href={shopHref("/checkout")} onClick={() => setDrawerOpen(false)} className="inline-flex h-12 items-center justify-center rounded-full bg-accent font-semibold text-ink-950 hover:bg-accent-soft">
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
