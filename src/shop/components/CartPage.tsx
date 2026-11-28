"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bookmark, LoaderCircle, ShieldCheck, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import type { PublicCart } from "@/shop/server/serialize";
import { api, ApiError } from "./api";
import { FreeShippingMeter, QuantityStepper, useCartMutations } from "./CartDrawer";
import { useShop } from "./ShopProvider";
import { EmptyState, Notice, ProductPlaceholder, Skeleton } from "./ui";

export function CartPage() {
  const { cart, cartLoading } = useShop();
  const { busy, setQty, remove, saveForLater } = useCartMutations();

  if (cartLoading && !cart)
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  if (!cart || (!cart.lines.length && !cart.saved.length))
    return (
      <EmptyState icon={<ShoppingBag className="h-7 w-7" />} title="Your cart is empty" action={<Link href={shopHref("/products")} className="inline-flex h-12 items-center rounded-full bg-ink-900 px-7 font-semibold text-white hover:bg-ink-700">Start shopping</Link>}>
        Browse planters, lamps, desk gear and personalised gifts — all printed to order.
      </EmptyState>
    );

  const Line = ({ l, saved = false }: { l: PublicCart["lines"][number]; saved?: boolean }) => (
    <li className={`flex gap-4 py-5 ${busy === l.id ? "opacity-60" : ""}`}>
      <Link href={shopHref(`/products/${l.slug}`)} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line sm:h-28 sm:w-28">
        {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="112px" className="object-cover" /> : <ProductPlaceholder name={l.name} className="h-full w-full" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={shopHref(`/products/${l.slug}`)} className="font-semibold hover:text-accent-ink">{l.name}</Link>
            {l.variantTitle && <p className="text-sm text-muted">{l.variantTitle}</p>}
            {l.customizationLabels.map((c) => <p key={c.label} className="text-sm text-muted">{c.label}: <span className="text-text">{c.value}</span></p>)}
          </div>
          <div className="text-right">
            <p className="font-bold">{formatINR(l.lineTotal)}</p>
            <p className="text-xs text-muted">{formatINR(l.unitPrice)} each{l.compareAt && <span className="ml-1 line-through">{formatINR(l.compareAt)}</span>}</p>
          </div>
        </div>
        {l.issue && <p className="mt-2 text-sm font-medium text-danger">{l.issue}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!saved && <QuantityStepper size="sm" value={l.quantity} max={l.maxQuantity} disabled={busy === l.id} onChange={(q) => setQty(l.id, q)} />}
          <button type="button" onClick={() => saveForLater(l.id, !saved)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
            <Bookmark className="h-4 w-4" /> {saved ? "Move to cart" : "Save for later"}
          </button>
          <button type="button" onClick={() => remove(l.id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger">
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        {cart.lines.length > 0 ? (
          <section className="card px-5" aria-label="Items in your cart">
            <ul className="divide-y divide-line">{cart.lines.map((l) => <Line key={l.id} l={l} />)}</ul>
          </section>
        ) : (
          <Notice>Your cart is empty — items you saved for later are below.</Notice>
        )}
        {cart.saved.length > 0 && (
          <section className="mt-8" aria-labelledby="saved-h">
            <h2 id="saved-h" className="text-lg font-bold">Saved for later ({cart.saved.length})</h2>
            <div className="card mt-3 px-5"><ul className="divide-y divide-line">{cart.saved.map((l) => <Line key={l.id} l={l} saved />)}</ul></div>
          </section>
        )}
        <Link href={shopHref("/products")} className="mt-6 inline-flex items-center gap-2 font-semibold text-accent-ink hover:underline"><ArrowLeft className="h-4 w-4" /> Continue shopping</Link>
      </div>
      {cart.lines.length > 0 && <CartSummary cart={cart} />}
    </div>
  );
}

export function CouponBox({ cart, onChange }: { cart: PublicCart; onChange?: (c: PublicCart) => void }) {
  const { setCart } = useShop();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const apply = async (remove = false) => {
    setBusy(true);
    setErr(null);
    try {
      const c = await api<PublicCart>("/cart/coupon", remove ? { method: "DELETE" } : { body: { code } });
      setCart(c);
      onChange?.(c);
      setCode("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't apply this code.");
    } finally {
      setBusy(false);
    }
  };
  if (cart.couponCode)
    return (
      <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ${cart.couponApplied ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>
        <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> <strong>{cart.couponCode}</strong> {cart.couponApplied ? "applied" : `— ${cart.couponError}`}</span>
        <button type="button" onClick={() => apply(true)} disabled={busy} className="rounded-full p-1 hover:bg-black/5" aria-label="Remove coupon"><X className="h-4 w-4" /></button>
      </div>
    );
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) apply(); }}>
      <label htmlFor="coupon" className="sr-only">Coupon code</label>
      <div className="flex gap-2">
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="input h-11 py-0 font-mono uppercase" maxLength={40} />
        <button type="submit" disabled={busy || !code.trim()} className="inline-flex h-11 items-center gap-1 rounded-full border border-line px-4 text-sm font-semibold hover:bg-paper disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Apply"}</button>
      </div>
      {err && <p className="mt-2 text-sm text-danger" role="alert">{err}</p>}
    </form>
  );
}

export function SummaryRows({ cart, shippingKnown = false }: { cart: PublicCart; shippingKnown?: boolean }) {
  const t = cart.totals;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? "" : "s"})</dt><dd>{formatINR(t.subtotal)}</dd></div>
      {t.discountTotal > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>−{formatINR(t.discountTotal)}</dd></div>}
      <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{t.shippingTotal === 0 ? <span className="font-semibold text-success">Free</span> : shippingKnown ? formatINR(t.shippingTotal) : `from ${formatINR(t.shippingTotal)}`}</dd></div>
      {t.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">Cash on delivery fee</dt><dd>{formatINR(t.codFee)}</dd></div>}
      <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold"><dt>Total</dt><dd>{formatINR(t.grandTotal)}</dd></div>
      <div className="flex justify-between text-xs text-muted"><dt>Includes GST</dt><dd>{formatINR(t.taxTotal)}</dd></div>
    </dl>
  );
}

function CartSummary({ cart }: { cart: PublicCart }) {
  return (
    <aside className="card space-y-5 p-6 lg:sticky lg:top-36" aria-label="Order summary">
      <h2 className="text-lg font-bold">Order summary</h2>
      <FreeShippingMeter cart={cart} />
      <CouponBox cart={cart} />
      <SummaryRows cart={cart} />
      {cart.hasIssues && <Notice tone="warning">Please fix the highlighted items before checking out.</Notice>}
      {cart.hasIssues ? (
        <span aria-disabled="true" className="flex h-13 w-full cursor-not-allowed items-center justify-center rounded-full bg-accent/50 font-semibold text-ink-950">Proceed to checkout</span>
      ) : (
        <Link href={shopHref("/checkout")} className="flex h-13 w-full items-center justify-center rounded-full bg-accent font-semibold text-ink-950 hover:bg-accent-soft">Proceed to checkout</Link>
      )}
      <p className="flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" /> Secure checkout · UPI, cards, net banking</p>
    </aside>
  );
}
