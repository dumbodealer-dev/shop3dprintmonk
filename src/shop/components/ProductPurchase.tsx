"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Heart, LoaderCircle, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import type { CustomizationInput, ProductDetail, VariantView } from "@/shop/lib/types";
import { track } from "@/lib/analytics";
import { api, ApiError } from "./api";
import { QuantityStepper } from "./CartDrawer";
import { useShop } from "./ShopProvider";
import { Price } from "./ui";

const COLOR_SWATCH: Record<string, string> = {
  orange: "#ff6a13", "monk orange": "#ff6a13", charcoal: "#36302c", black: "#111", white: "#f5f5f5", grey: "#9ca3af", gray: "#9ca3af",
  "silk gold": "#d4a73c", gold: "#d4a73c", "galaxy black": "#1e1b2e", blue: "#2563eb", red: "#dc2626", green: "#16a34a", rainbow: "conic-gradient(red,orange,yellow,green,blue,violet,red)",
};
const swatch = (v: string) => COLOR_SWATCH[v.toLowerCase()] ?? (v.toLowerCase().includes(" on ") ? COLOR_SWATCH[v.toLowerCase().split(" on ")[0]] : undefined);

export function ProductPurchase({ product, compact = false, onAdded }: { product: ProductDetail; compact?: boolean; onAdded?: () => void }) {
  const router = useRouter();
  const { addToCart, wishlist, toggleWishlist } = useShop();
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [sel, setSel] = useState<Record<string, string>>(firstAvailable?.options ?? {});
  const [custom, setCustom] = useState<CustomizationInput>({});
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const variant: VariantView | undefined = useMemo(
    () => (product.axes.length ? product.variants.find((v) => product.axes.every((a) => v.options[a.name] === sel[a.name])) : product.variants[0]),
    [product, sel],
  );

  const surcharge = product.customization.reduce((s, o) => {
    const v = custom[o.id];
    if (o.type === "select") return s + (o.choices.find((c) => c.label === v)?.priceDelta ?? 0);
    if (o.type === "checkbox") return s + (v === true ? o.priceDelta : 0);
    return s + (typeof v === "string" && v.trim() ? o.priceDelta : 0);
  }, 0);

  const comboExists = (axis: string, value: string) =>
    product.variants.some((v) => v.options[axis] === value && product.axes.every((a) => a.name === axis || v.options[a.name] === sel[a.name]));
  const comboAvailable = (axis: string, value: string) =>
    product.variants.some((v) => v.available && v.options[axis] === value && product.axes.every((a) => a.name === axis || v.options[a.name] === sel[a.name]));

  function pick(axis: string, value: string) {
    const next = { ...sel, [axis]: value };
    // If the combination doesn't exist, jump to the closest variant that has this value.
    if (!product.variants.some((v) => product.axes.every((a) => v.options[a.name] === next[a.name]))) {
      const alt = product.variants.find((v) => v.options[axis] === value && v.available) ?? product.variants.find((v) => v.options[axis] === value);
      if (alt) return setSel(alt.options);
    }
    setSel(next);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    for (const o of product.customization) {
      const v = custom[o.id];
      if (o.type === "text" && o.required && !(typeof v === "string" && v.trim())) e[o.id] = `Please fill in ${o.label.toLowerCase()}`;
      if (o.type === "select" && o.required && !v) e[o.id] = `Please choose ${o.label.toLowerCase()}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function add(buyNow: boolean) {
    if (!variant || !validate()) return;
    setBusy(buyNow ? "buy" : "cart");
    const ok = await addToCart(variant.id, qty, custom, { openDrawer: !buyNow && !compact });
    setBusy(null);
    if (!ok) return;
    onAdded?.();
    if (buyNow) {
      track("shop_begin_checkout", { value: ((variant.salePrice ?? variant.price) + surcharge) * qty, currency: "INR" });
      router.push(shopHref("/checkout"));
    }
  }

  const unit = variant ? (variant.salePrice ?? variant.price) + surcharge : 0;
  const outOfStock = !variant || !variant.available;
  const maxQty = variant?.trackInventory ? Math.min(variant.stock, 99) : 99;
  const saved = wishlist.has(product.id);

  return (
    <div className="space-y-6">
      <div>
        {variant ? <Price price={variant.price + surcharge} sale={variant.salePrice != null ? variant.salePrice + surcharge : null} size="lg" /> : <span className="text-lg text-muted">Unavailable</span>}
        <p className="mt-1 text-xs text-muted">Inclusive of all taxes (GST)</p>
      </div>

      {product.axes.map((axis) => (
        <fieldset key={axis.name}>
          <legend className="mb-2 text-sm font-semibold">
            {axis.name}: <span className="font-normal text-muted">{sel[axis.name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {axis.values.map((v) => {
              const active = sel[axis.name] === v;
              const exists = comboExists(axis.name, v);
              const avail = comboAvailable(axis.name, v);
              const sw = /colou?r/i.test(axis.name) ? swatch(v) : undefined;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pick(axis.name, v)}
                  aria-pressed={active}
                  className={`relative inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-ink-300"} ${!avail ? "text-muted" : ""} ${!exists ? "opacity-50" : ""}`}
                >
                  {sw && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: sw }} aria-hidden="true" />}
                  <span className={!avail ? "line-through decoration-1" : ""}>{v}</span>
                  {!avail && <span className="sr-only">(sold out)</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {product.customization.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-accent/30 bg-accent/[0.04] p-4">
          <p className="text-sm font-bold">Personalise it</p>
          {product.customization.map((o) => (
            <div key={o.id}>
              {o.type === "text" && (
                <>
                  <label htmlFor={`c-${o.id}`} className="field-label">
                    {o.label} {o.required ? <span className="text-danger">*</span> : <span className="font-normal text-muted">(optional)</span>}
                    {o.priceDelta > 0 && <span className="ml-1 font-normal text-muted">+{formatINR(o.priceDelta)}</span>}
                  </label>
                  <input id={`c-${o.id}`} className="input" maxLength={o.maxLength} placeholder={o.placeholder} value={(custom[o.id] as string) ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [o.id]: e.target.value }))} aria-invalid={!!errors[o.id]} />
                  <p className="field-hint">{((custom[o.id] as string) ?? "").length}/{o.maxLength} characters{o.help ? ` · ${o.help}` : ""}</p>
                </>
              )}
              {o.type === "select" && (
                <fieldset>
                  <legend className="field-label">{o.label} {o.required && <span className="text-danger">*</span>}</legend>
                  <div className="flex flex-wrap gap-2">
                    {o.choices.map((c) => (
                      <button key={c.label} type="button" aria-pressed={custom[o.id] === c.label} onClick={() => setCustom((x) => ({ ...x, [o.id]: c.label }))} className={`inline-flex h-10 items-center rounded-full border px-4 text-sm ${custom[o.id] === c.label ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-ink-300"}`}>
                        {c.label}{c.priceDelta > 0 && <span className="ml-1 opacity-70">+{formatINR(c.priceDelta)}</span>}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {o.type === "checkbox" && (
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={custom[o.id] === true} onChange={(e) => setCustom((x) => ({ ...x, [o.id]: e.target.checked }))} />
                  {o.label} {o.priceDelta > 0 && <span className="text-muted">+{formatINR(o.priceDelta)}</span>}
                </label>
              )}
              {errors[o.id] && <p className="field-error" role="alert">{errors[o.id]}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="text-sm">
        {outOfStock ? (
          <p className="font-semibold text-danger">Out of stock{product.variants.some((v) => v.available) ? " in this option — try another" : ""}</p>
        ) : variant!.lowStock ? (
          <p className="font-semibold text-warning">Only {variant!.stock} left — order soon</p>
        ) : (
          <p className="flex items-center gap-1.5 font-semibold text-success"><Check className="h-4 w-4" /> In stock</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} max={maxQty} onChange={setQty} disabled={outOfStock} />
        <button type="button" onClick={() => add(false)} disabled={outOfStock || !!busy} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50">
          {busy === "cart" && <LoaderCircle className="h-4 w-4 animate-spin" />} Add to cart {variant && !outOfStock && <span className="opacity-70">· {formatINR(unit * qty)}</span>}
        </button>
        {!compact && (
          <button type="button" onClick={() => toggleWishlist(product.id)} aria-pressed={saved} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white hover:border-accent" aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}>
            <Heart className={`h-5 w-5 ${saved ? "fill-accent text-accent" : ""}`} />
          </button>
        )}
      </div>
      <button type="button" onClick={() => add(true)} disabled={outOfStock || !!busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-ink-950 transition hover:bg-accent-soft disabled:opacity-50">
        {busy === "buy" && <LoaderCircle className="h-4 w-4 animate-spin" />} Buy now
      </button>

      {!compact && <DeliveryChecker leadDays={product.leadTimeDays} />}
      {!compact && (
        <ul className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <li className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-accent-ink" /> {product.leadTimeDays ? `Printed to order · ships in ~${product.leadTimeDays + 1} days` : "Ready to ship"}</li>
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-ink" /> Secure payment</li>
          <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent-ink" /> Pan-India delivery</li>
        </ul>
      )}
    </div>
  );
}

function DeliveryChecker({ leadDays }: { leadDays: number }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ serviceable: boolean; message: string; cod: boolean; options: { id: string; label: string; eta: string }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^[1-9]\d{5}$/.test(pin)) return setErr("Enter a valid 6-digit PIN code");
          setBusy(true);
          setErr(null);
          try {
            setRes(await api(`/pincode?pin=${pin}&lead=${leadDays}`));
          } catch (x) {
            setErr(x instanceof ApiError ? x.message : "Couldn't check right now.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="pdp-pin" className="sr-only">Delivery PIN code</label>
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="pdp-pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Enter PIN code for delivery date" className="input h-11 py-0 pl-9" />
        </div>
        <button type="submit" disabled={busy} className="h-11 rounded-full border border-line px-4 text-sm font-semibold hover:bg-paper">{busy ? "…" : "Check"}</button>
      </form>
      {err && <p className="mt-2 text-sm text-danger" role="alert">{err}</p>}
      {res && (
        <div className="mt-3 text-sm" role="status">
          {res.serviceable ? (
            <>
              <ul className="space-y-1">{res.options.map((o) => <li key={o.id}><span className="font-semibold">{o.label}:</span> get it {o.eta}</li>)}</ul>
              <p className="mt-1 text-muted">{res.cod ? "Cash on delivery available" : "Prepaid only for this PIN code"}</p>
            </>
          ) : (
            <p className="text-danger">{res.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
