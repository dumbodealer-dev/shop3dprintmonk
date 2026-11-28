"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, LoaderCircle, Lock, ShieldCheck, Truck } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { checkoutSchema, fieldErrors } from "@/shop/lib/validation";
import type { PublicCart } from "@/shop/server/serialize";
import { track } from "@/lib/analytics";
import { api, ApiError } from "../api";
import { CouponBox, SummaryRows } from "../CartPage";
import { useShop } from "../ShopProvider";
import { EmptyState, Notice, ProductPlaceholder, Skeleton } from "../ui";
import { AddressFields, emptyAddress, type AddressValue } from "./AddressFields";
import { payWithRazorpay } from "./razorpay";

export type SavedAddress = AddressValue & { id: string; label: string | null; isDefaultShipping: boolean; isDefaultBilling: boolean };
type Quote = {
  cart: PublicCart;
  service: { serviceable: boolean; message: string; cod: boolean; local: boolean } | null;
  methods: { id: string; label: string; rate: number; free: boolean; etaFrom: string; etaTo: string }[];
  cod: { available: boolean; reason: string | null };
  razorpayAvailable: boolean;
};
type PlaceResult = { orderNumber: string; accessKey: string; redirect: string; payment: Parameters<typeof payWithRazorpay>[0] | null };

const eta = (from: string, to: string) => {
  const f = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  return from === to ? f.format(new Date(to)) : `${f.format(new Date(from))} – ${f.format(new Date(to))}`;
};

export function CheckoutForm({ customer, addresses, gstEnabled, codFee }: { customer: { email: string; fullName: string; phone: string | null } | null; addresses: SavedAddress[]; gstEnabled: boolean; codFee: number }) {
  const router = useRouter();
  const { refreshCart } = useShop();
  const defShip = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];
  const defBill = addresses.find((a) => a.isDefaultBilling);
  const [contact, setContact] = useState({ email: customer?.email ?? "", phone: customer?.phone ?? "", fullName: customer?.fullName ?? "" });
  const [savedId, setSavedId] = useState<string | "new">(defShip?.id ?? "new");
  const [ship, setShip] = useState<AddressValue>(defShip ? { ...defShip } : { ...emptyAddress(), fullName: customer?.fullName ?? "", phone: customer?.phone ?? "" });
  const [billSame, setBillSame] = useState(!defBill || defBill.id === defShip?.id);
  const [bill, setBill] = useState<AddressValue>(defBill ? { ...defBill } : emptyAddress());
  const [wantGst, setWantGst] = useState(false);
  const [gstin, setGstin] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [method, setMethod] = useState<string>("");
  const [payment, setPayment] = useState<"razorpay" | "cod">("razorpay");
  const [notes, setNotes] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [terms, setTerms] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PlaceResult | null>(null);
  const [idemKey] = useState(() => crypto.randomUUID());
  const [requote, setRequote] = useState(0);

  // Live, server-calculated totals whenever something that affects price changes.
  const pin = /^[1-9]\d{5}$/.test(ship.pincode) ? ship.pincode : undefined;
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const q = await api<Quote>("/checkout/quote", { body: { shippingMethod: method || undefined, state: ship.state || undefined, pincode: pin, paymentMethod: payment, email: contact.email || null } });
        if (cancelled) return;
        setQuote(q);
        setQuoteErr(null);
        if (!method && q.methods[0]) setMethod(q.methods[0].id);
        if (payment === "cod" && !q.cod.available) setPayment("razorpay");
        if (payment === "razorpay" && !q.razorpayAvailable && q.cod.available) setPayment("cod");
      } catch (e) {
        if (!cancelled) setQuoteErr(e instanceof ApiError ? e.message : "Couldn't calculate totals.");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [method, ship.state, pin, payment, contact.email, requote]);

  const cart = quote?.cart;
  const canPay = !!quote && (quote.razorpayAvailable || quote.cod.available);
  const payload = useMemo(
    () => ({
      idempotencyKey: idemKey,
      contact,
      shippingAddress: ship,
      billingSameAsShipping: billSame,
      billingAddress: billSame ? null : bill,
      gstin: wantGst ? gstin : null,
      businessName: wantGst ? businessName : null,
      shippingMethod: method,
      paymentMethod: payment,
      couponCode: cart?.couponCode ?? null,
      notes,
      createAccount: !customer && createAccount,
      password: !customer && createAccount ? password : null,
      marketingOptIn: optIn,
      acceptTerms: terms,
    }),
    [idemKey, contact, ship, billSame, bill, wantGst, gstin, businessName, method, payment, cart?.couponCode, notes, customer, createAccount, password, optIn, terms],
  );

  async function pay(result: PlaceResult) {
    if (!result.payment) {
      router.push(result.redirect);
      return;
    }
    const outcome = await payWithRazorpay(result.payment);
    if (outcome.status === "paid") {
      track("shop_purchase", { value: result.payment.amount / 100, currency: "INR" });
      await refreshCart();
      router.push(outcome.redirect);
    } else if (outcome.status === "pending") {
      router.push(result.redirect);
    } else {
      setPendingOrder(result);
      setPlacing(false);
      setSubmitError(outcome.status === "failed" ? outcome.message : "Payment was not completed. Your order is reserved for a short while — you can try again.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], .field-error")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setErrors({});
    setPlacing(true);
    try {
      const result = await api<PlaceResult>("/checkout/place", { body: payload });
      if (!result.payment) {
        track("shop_purchase", { value: cart?.totals.grandTotal, currency: "INR" });
        await refreshCart();
      }
      await pay(result);
    } catch (err) {
      setPlacing(false);
      if (err instanceof ApiError) {
        if (err.fields) setErrors(err.fields);
        setSubmitError(err.message);
        if (err.code === "stock" || err.code === "cart_issues") refreshCart();
      } else setSubmitError(err instanceof Error ? err.message : "Couldn't place your order.");
    }
  }

  async function retry() {
    if (!pendingOrder) return;
    setPlacing(true);
    setSubmitError(null);
    try {
      const r = await api<PlaceResult>("/payments/razorpay/retry", { body: { orderNumber: pendingOrder.orderNumber, key: pendingOrder.accessKey } });
      await pay(r);
    } catch (err) {
      setPlacing(false);
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't restart payment.");
    }
  }

  if (quote && !cart?.lines.length && !pendingOrder)
    return (
      <EmptyState title="Your cart is empty" action={<Link href={shopHref("/products")} className="inline-flex h-12 items-center rounded-full bg-ink-900 px-7 font-semibold text-white">Continue shopping</Link>}>
        Add something you love, then come back to check out.
      </EmptyState>
    );

  const err = (k: string) => errors[k];
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <Section n={1} title="Contact">
          {!customer && (
            <p className="mb-4 text-sm text-muted">
              Have an account? <Link href={shopHref("/account/login?next=/checkout")} className="font-semibold text-accent-ink underline">Sign in</Link> for faster checkout — or continue as a guest.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" autoComplete="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} error={err("contact.email")} />
            <Input label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} error={err("contact.phone")} hint="For delivery updates" />
            <Input label="Full name" autoComplete="name" className="sm:col-span-2" value={contact.fullName} onChange={(v) => setContact({ ...contact, fullName: v })} error={err("contact.fullName")} />
          </div>
        </Section>

        <Section n={2} title="Shipping address">
          {addresses.length > 0 && (
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {addresses.map((a) => (
                <button type="button" key={a.id} onClick={() => { setSavedId(a.id); setShip({ ...a }); }} aria-pressed={savedId === a.id} className={`rounded-xl border p-3 text-left text-sm ${savedId === a.id ? "border-accent ring-2 ring-accent/20" : "border-line hover:border-ink-300"}`}>
                  <span className="font-semibold">{a.label ?? a.fullName}</span>
                  <span className="mt-0.5 block text-muted">{a.line1}, {a.city} {a.pincode}</span>
                </button>
              ))}
              <button type="button" onClick={() => { setSavedId("new"); setShip({ ...emptyAddress(), fullName: contact.fullName, phone: contact.phone }); }} aria-pressed={savedId === "new"} className={`rounded-xl border border-dashed p-3 text-left text-sm font-semibold ${savedId === "new" ? "border-accent" : "border-line"}`}>+ New address</button>
            </div>
          )}
          <AddressFields prefix="shippingAddress" value={ship} onChange={(v) => { setShip(v); setSavedId("new"); }} errors={errors} />
          {quote?.service && !quote.service.serviceable && <div className="mt-4"><Notice tone="danger">{quote.service.message}</Notice></div>}
        </Section>

        <Section n={3} title="Billing & GST">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={billSame} onChange={(e) => setBillSame(e.target.checked)} /> Billing address is the same as shipping
          </label>
          {!billSame && <div className="mt-5"><AddressFields prefix="billingAddress" value={bill} onChange={setBill} errors={errors} /></div>}
          {gstEnabled && (
            <>
              <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={wantGst} onChange={(e) => setWantGst(e.target.checked)} /> I need a GST invoice for my business
              </label>
              {wantGst && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input label="GSTIN" value={gstin} onChange={(v) => setGstin(v.toUpperCase())} error={err("gstin")} hint="15 characters, e.g. 07ABCDE1234F1Z5" maxLength={15} className="font-mono" />
                  <Input label="Registered business name" value={businessName} onChange={setBusinessName} error={err("businessName")} />
                </div>
              )}
            </>
          )}
        </Section>

        <Section n={4} title="Delivery method">
          {!quote ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="grid gap-2">
              {quote.methods.map((m) => (
                <label key={m.id} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 ${method === m.id ? "border-accent ring-2 ring-accent/20" : "border-line hover:border-ink-300"}`}>
                  <input type="radio" name="method" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <Truck className="h-5 w-5 text-accent-ink" />
                  <span className="flex-1">
                    <span className="block font-semibold">{m.label}</span>
                    <span className="text-sm text-muted">Estimated delivery {eta(m.etaFrom, m.etaTo)}</span>
                  </span>
                  <span className="font-semibold">{m.free ? <span className="text-success">Free</span> : formatINR(m.rate)}</span>
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section n={5} title="Payment">
          {!quote ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="grid gap-2">
              <label className={`flex items-center gap-4 rounded-xl border p-4 ${!quote.razorpayAvailable ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${payment === "razorpay" ? "border-accent ring-2 ring-accent/20" : "border-line"}`}>
                <input type="radio" name="pay" className="h-4 w-4 accent-[var(--color-accent-ink)]" disabled={!quote.razorpayAvailable} checked={payment === "razorpay"} onChange={() => setPayment("razorpay")} />
                <CreditCard className="h-5 w-5 text-accent-ink" />
                <span className="flex-1">
                  <span className="block font-semibold">Pay online</span>
                  <span className="text-sm text-muted">{quote.razorpayAvailable ? "UPI · Cards · Net banking · Wallets — secured by Razorpay" : "Online payment is temporarily unavailable"}</span>
                </span>
              </label>
              <label className={`flex items-center gap-4 rounded-xl border p-4 ${!quote.cod.available ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${payment === "cod" ? "border-accent ring-2 ring-accent/20" : "border-line"}`}>
                <input type="radio" name="pay" className="h-4 w-4 accent-[var(--color-accent-ink)]" disabled={!quote.cod.available} checked={payment === "cod"} onChange={() => setPayment("cod")} />
                <Banknote className="h-5 w-5 text-accent-ink" />
                <span className="flex-1">
                  <span className="block font-semibold">Cash on delivery{codFee > 0 && quote.cod.available ? <span className="font-normal text-muted"> (+{formatINR(codFee)})</span> : null}</span>
                  <span className="text-sm text-muted">{quote.cod.available ? "Pay in cash or UPI when your order arrives" : quote.cod.reason}</span>
                </span>
              </label>
            </div>
          )}
          <div className="mt-5">
            <label htmlFor="notes" className="field-label">Order notes <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="notes" className="input" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, gift message…" />
          </div>
          {!customer && (
            <div className="mt-5 rounded-xl bg-paper p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} /> Create an account to track orders and check out faster
              </label>
              {createAccount && <div className="mt-3"><Input label="Choose a password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={err("password")} hint="At least 8 characters" /></div>}
            </div>
          )}
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} /> Email me about new products and offers
          </label>
        </Section>
      </div>

      <aside className="card space-y-5 p-6 lg:sticky lg:top-36" aria-label="Order summary">
        <h2 className="text-lg font-bold">Order summary</h2>
        {!cart ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <ul className="max-h-72 space-y-3 overflow-y-auto">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex gap-3 text-sm">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
                    {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : <ProductPlaceholder name={l.name} className="h-full w-full" />}
                    <span className="absolute -right-1 -top-1 rounded-full bg-ink-900 px-1.5 text-[0.65rem] font-bold text-white">{l.quantity}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.name}</span>
                    <span className="block truncate text-xs text-muted">{[l.variantTitle, ...l.customizationLabels.map((c) => c.value)].filter(Boolean).join(" · ")}</span>
                    {l.issue && <span className="block text-xs text-danger">{l.issue}</span>}
                  </span>
                  <span className="font-semibold">{formatINR(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <CouponBox cart={cart} onChange={() => setRequote((n) => n + 1)} />
            {quoteErr && <Notice tone="danger">{quoteErr}</Notice>}
            <SummaryRows cart={cart} shippingKnown />
            {cart.totals.taxBreakdown.type === "inter" ? (
              <p className="text-xs text-muted">IGST {formatINR(cart.totals.taxBreakdown.igst)}</p>
            ) : (
              <p className="text-xs text-muted">CGST {formatINR(cart.totals.taxBreakdown.cgst)} · SGST {formatINR(cart.totals.taxBreakdown.sgst)}</p>
            )}
          </>
        )}
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent-ink)]" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={!!err("acceptTerms")} />
          <span>I agree to the <Link href={shopHref("/policies/terms")} target="_blank" className="font-semibold underline">terms</Link>, <Link href={shopHref("/policies/returns-refunds")} target="_blank" className="font-semibold underline">returns policy</Link> and <Link href={shopHref("/policies/privacy")} target="_blank" className="font-semibold underline">privacy policy</Link>.</span>
        </label>
        {err("acceptTerms") && <p className="field-error">{err("acceptTerms")}</p>}
        {submitError && <Notice tone="danger">{submitError}</Notice>}
        {pendingOrder ? (
          <button type="button" onClick={retry} disabled={placing} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-ink-950 hover:bg-accent-soft disabled:opacity-60">
            {placing && <LoaderCircle className="h-4 w-4 animate-spin" />} Retry payment for {pendingOrder.orderNumber}
          </button>
        ) : (
          <button type="submit" disabled={placing || !cart || cart.hasIssues || !canPay || quote?.service?.serviceable === false} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-ink-950 hover:bg-accent-soft disabled:opacity-60">
            {placing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {payment === "cod" ? "Place order" : "Pay"} {cart ? formatINR(cart.totals.grandTotal) : ""}
          </button>
        )}
        <p className="flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4" /> Payments are processed by Razorpay. We never see or store card details.</p>
      </aside>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 text-lg font-bold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 font-mono text-xs text-white">{n}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, error, hint, className = "", ...props }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={className.includes("col-span") ? className : ""}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} className={`input ${className.includes("col-span") ? "" : className}`} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...props} />
      {error ? <p className="field-error" role="alert">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
