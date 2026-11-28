"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { shopHref } from "@/shop/config";
import type { ShopSettings, SettingsSection } from "@/shop/lib/settings-schema";
import { deleteBannerAction, deleteCollectionAction, saveBannerAction, saveCollectionAction, saveSettingsAction } from "@/shop/server/admin/actions";
import { Badge } from "../ui";
import { Btn, F, inputCls, ResultNote, Toggle, useAdminAction } from "./kit";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "banners");
  const res = await fetch(shopHref("/admin/api/upload"), { method: "POST", body: fd });
  const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !d.url) throw new Error(d.error ?? "Upload failed");
  return d.url;
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <F label="Image" hint="Optional. Wide images (2000 × 900 px) work best for the hero." error={err ?? undefined}>
      <div className="flex gap-2">
        <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
        <label className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full border border-line px-3 text-xs font-semibold">
          {busy ? "…" : "Upload"}
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); setErr(null); try { onChange(await uploadImage(f)); } catch (x) { setErr(x instanceof Error ? x.message : "Upload failed"); } setBusy(false); }} />
        </label>
      </div>
    </F>
  );
}

export type BannerRow = { id: string; placement: "hero" | "promo" | "strip"; title: string; subtitle: string | null; cta_label: string | null; cta_url: string | null; image_url: string | null; theme: "dark" | "light" | "accent"; is_active: boolean; starts_at: string | null; ends_at: string | null; sort_order: number };

export function BannerManager({ rows }: { rows: BannerRow[] }) {
  const a = useAdminAction();
  const empty = { id: null as string | null, placement: "hero" as BannerRow["placement"], title: "", subtitle: "", ctaLabel: "", ctaUrl: "/products", imageUrl: "", theme: "dark" as BannerRow["theme"], isActive: true, startsAt: "", endsAt: "", sortOrder: "100" };
  const [f, setF] = useState(empty);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <ul className="space-y-3">
        {rows.map((b) => (
          <li key={b.id} className="card flex items-start gap-4 p-4">
            <Badge tone={b.placement === "hero" ? "accent" : b.placement === "promo" ? "info" : "neutral"}>{b.placement}</Badge>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.title} {!b.is_active && <Badge>Hidden</Badge>}</p>
              {b.subtitle && <p className="text-sm text-muted">{b.subtitle}</p>}
              <p className="text-xs text-muted">{b.cta_label ? `${b.cta_label} → ${b.cta_url}` : ""}{b.ends_at ? ` · until ${new Date(b.ends_at).toLocaleDateString("en-IN")}` : ""}</p>
            </div>
            <button type="button" aria-label="Edit" className="text-muted hover:text-text" onClick={() => setF({ id: b.id, placement: b.placement, title: b.title, subtitle: b.subtitle ?? "", ctaLabel: b.cta_label ?? "", ctaUrl: b.cta_url ?? "", imageUrl: b.image_url ?? "", theme: b.theme, isActive: b.is_active, startsAt: toLocal(b.starts_at), endsAt: toLocal(b.ends_at), sortOrder: String(b.sort_order) })}><Pencil className="h-4 w-4" /></button>
            <button type="button" aria-label="Delete" className="text-muted hover:text-danger" onClick={() => a.run(() => deleteBannerAction(b.id), { confirm: "Delete this banner?" })}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!rows.length && <li className="card p-8 text-center text-muted">No banners yet — the homepage shows a default hero.</li>}
      </ul>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => saveBannerAction({ ...f, startsAt: toIso(f.startsAt), endsAt: toIso(f.endsAt) }), { onOk: () => setF(empty) }); }}>
        <h2 className="font-bold">{f.id ? "Edit banner" : "New banner"}</h2>
        <ResultNote result={a.result} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Placement"><select className={inputCls} value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value as BannerRow["placement"] })}><option value="hero">Hero slide</option><option value="promo">Promo tile</option><option value="strip">Top announcement</option></select></F>
          <F label="Style"><select className={inputCls} value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value as BannerRow["theme"] })}><option value="dark">Dark</option><option value="light">Light</option><option value="accent">Orange</option></select></F>
        </div>
        <F label="Title" error={a.fields.title}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></F>
        {f.placement !== "strip" && <F label="Subtitle"><input className={inputCls} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></F>}
        {f.placement !== "strip" && (
          <div className="grid grid-cols-2 gap-3">
            <F label="Button label"><input className={inputCls} value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} /></F>
            <F label="Button link" hint="/products, /category/…" error={a.fields.ctaUrl}><input className={inputCls} value={f.ctaUrl} onChange={(e) => setF({ ...f, ctaUrl: e.target.value })} /></F>
          </div>
        )}
        {f.placement !== "strip" && <ImageField value={f.imageUrl} onChange={(v) => setF({ ...f, imageUrl: v })} />}
        <div className="grid grid-cols-2 gap-3">
          <F label="Show from"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></F>
          <F label="Show until"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></F>
        </div>
        <F label="Order"><input className={inputCls} inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></F>
        <Toggle label="Active" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
        <div className="flex gap-2"><Btn type="submit" variant="accent" pending={a.pending}>Save banner</Btn>{f.id && <Btn variant="outline" onClick={() => setF(empty)}>New instead</Btn>}</div>
      </form>
    </div>
  );
}

export type CollectionRow = { id: string; slug: string; name: string; description: string | null; image_url: string | null; is_featured: boolean; is_seasonal: boolean; is_active: boolean; starts_at: string | null; ends_at: string | null; sort_order: number; productIds: string[] };

export function CollectionManager({ rows, products }: { rows: CollectionRow[]; products: { id: string; name: string }[] }) {
  const a = useAdminAction();
  const empty = { id: null as string | null, name: "", slug: "", description: "", imageUrl: "", isFeatured: true, isSeasonal: false, isActive: true, startsAt: "", endsAt: "", sortOrder: "100", productIds: [] as string[] };
  const [f, setF] = useState(empty);
  const [filter, setFilter] = useState("");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="card flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name} {c.is_seasonal && <Badge tone="warning">Seasonal</Badge>} {c.is_featured && <Badge tone="accent">Homepage</Badge>} {!c.is_active && <Badge>Hidden</Badge>}</p>
              <p className="text-xs text-muted">/collections/{c.slug} · {c.productIds.length} products</p>
            </div>
            <button type="button" aria-label="Edit" className="text-muted hover:text-text" onClick={() => setF({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.image_url ?? "", isFeatured: c.is_featured, isSeasonal: c.is_seasonal, isActive: c.is_active, startsAt: toLocal(c.starts_at), endsAt: toLocal(c.ends_at), sortOrder: String(c.sort_order), productIds: c.productIds })}><Pencil className="h-4 w-4" /></button>
            <button type="button" aria-label="Delete" className="text-muted hover:text-danger" onClick={() => a.run(() => deleteCollectionAction(c.id), { confirm: `Delete ${c.name}?` })}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!rows.length && <li className="card p-8 text-center text-muted">No collections yet.</li>}
      </ul>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => saveCollectionAction({ ...f, startsAt: toIso(f.startsAt), endsAt: toIso(f.endsAt) }), { onOk: () => setF(empty) }); }}>
        <h2 className="font-bold">{f.id ? "Edit collection" : "New collection"}</h2>
        <ResultNote result={a.result} />
        <F label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></F>
        <F label="Description"><textarea className={inputCls} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        <ImageField value={f.imageUrl} onChange={(v) => setF({ ...f, imageUrl: v })} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Live from"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></F>
          <F label="Live until"><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></F>
        </div>
        <Toggle label="Feature on the homepage" checked={f.isFeatured} onChange={(v) => setF({ ...f, isFeatured: v })} />
        <Toggle label="Seasonal collection" checked={f.isSeasonal} onChange={(v) => setF({ ...f, isSeasonal: v })} />
        <Toggle label="Active" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
        <F label={`Products (${f.productIds.length})`}><input className={inputCls} placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} /></F>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
          {products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())).map((p) => <Toggle key={p.id} label={p.name} checked={f.productIds.includes(p.id)} onChange={(on) => setF({ ...f, productIds: on ? [...f.productIds, p.id] : f.productIds.filter((x) => x !== p.id) })} />)}
        </div>
        <div className="flex gap-2"><Btn type="submit" variant="accent" pending={a.pending}><Plus className="h-4 w-4" /> Save collection</Btn>{f.id && <Btn variant="outline" onClick={() => setF(empty)}>New instead</Btn>}</div>
      </form>
    </div>
  );
}

// ── Settings (one form per section, typed by the shared zod schema) ───────
type FieldDef = { key: string; label: string; type?: "text" | "number" | "bool" | "textarea" | "list"; hint?: string };

const SECTIONS: { section: SettingsSection; title: string; fields: FieldDef[] }[] = [
  {
    section: "store", title: "Store & business details",
    fields: [
      { key: "name", label: "Store name" }, { key: "legalName", label: "Registered business name", hint: "Printed on GST invoices" }, { key: "logoUrl", label: "Logo URL (optional)" },
      { key: "email", label: "Store email" }, { key: "supportEmail", label: "Customer support email", hint: "Reply-to address on customer emails" }, { key: "phone", label: "Phone" }, { key: "whatsapp", label: "WhatsApp number (digits)" },
      { key: "addressLine", label: "Address" }, { key: "city", label: "City" }, { key: "state", label: "State", hint: "Decides CGST+SGST vs IGST" }, { key: "pincode", label: "PIN code" },
      { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" }, { key: "invoicePrefix", label: "Invoice number prefix", hint: "Capital letters/numbers, e.g. PM → PM/2026-27/00001" }, { key: "instagram", label: "Instagram URL" },
    ],
  },
  { section: "tax", title: "Tax (GST)", fields: [{ key: "pricesIncludeTax", label: "Product prices include GST", type: "bool" }, { key: "defaultGstRate", label: "Default GST rate %", type: "number" }, { key: "shippingGstRate", label: "GST on shipping / COD fee %", type: "number" }, { key: "enableGstInvoice", label: "Issue GST invoices and collect GSTIN at checkout", type: "bool" }] },
  {
    section: "payments", title: "Payments",
    fields: [{ key: "razorpayEnabled", label: "Online payments (Razorpay: UPI, cards, net banking, wallets)", type: "bool" }, { key: "codEnabled", label: "Cash on delivery", type: "bool" }, { key: "codFee", label: "COD fee ₹", type: "number" }, { key: "codMaxOrderValue", label: "COD maximum order value ₹ (0 = no limit)", type: "number" }, { key: "pendingPaymentMinutes", label: "Hold stock for unpaid orders (minutes)", type: "number" }],
  },
  {
    section: "shipping", title: "Shipping",
    fields: [{ key: "processingDays", label: "Processing days before dispatch", type: "number" }, { key: "serviceablePrefixes", label: "Serviceable PIN prefixes", type: "list", hint: "Comma separated, empty = all India" }, { key: "blockedPincodes", label: "Blocked PIN codes", type: "list" }, { key: "localPrefixes", label: "Local (fast) PIN prefixes", type: "list" }, { key: "localMaxDays", label: "Local max delivery days", type: "number" }, { key: "provider", label: "Shipping provider", hint: "manual or shiprocket (needs SHIPROCKET_* variables)" }],
  },
  { section: "notifications", title: "Email notifications", fields: [{ key: "adminEmails", label: "Team inboxes for new orders", type: "list", hint: "Comma separated; empty = BUSINESS_NOTIFICATION_EMAIL" }, { key: "notifyOnNewOrder", label: "Email the team on every new order", type: "bool" }, { key: "notifyOnLowStock", label: "Email the team about low stock", type: "bool" }, { key: "customerEmails", label: "Send order emails to customers", type: "bool" }] },
  { section: "policies", title: "Policies", fields: [{ key: "returns", label: "Returns & refunds", type: "textarea" }, { key: "shipping", label: "Shipping policy", type: "textarea" }, { key: "terms", label: "Terms & conditions", type: "textarea" }, { key: "privacy", label: "Privacy policy", type: "textarea" }] },
];

export const HOMEPAGE_FIELDS: FieldDef[] = [
  { key: "showCategories", label: "Category tiles", type: "bool" }, { key: "showFeatured", label: "Featured products", type: "bool" }, { key: "featuredTitle", label: "Featured section title" },
  { key: "showPromos", label: "Promo tiles", type: "bool" }, { key: "showBestsellers", label: "Bestsellers", type: "bool" }, { key: "showCollections", label: "Featured collections", type: "bool" },
  { key: "showNewArrivals", label: "New arrivals", type: "bool" }, { key: "showNewsletter", label: "Newsletter sign-up", type: "bool" }, { key: "newsletterTitle", label: "Newsletter title" }, { key: "newsletterText", label: "Newsletter text", type: "textarea" },
];

export function SettingsSectionForm({ section, title, fields, value }: { section: SettingsSection; title: string; fields: FieldDef[]; value: Record<string, unknown> }) {
  const a = useAdminAction();
  const [v, setV] = useState<Record<string, unknown>>(value);
  const set = (k: string, x: unknown) => setV((o) => ({ ...o, [k]: x }));
  return (
    <form className="card space-y-4 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); a.run(() => saveSettingsAction(section, v)); }}>
      <h2 className="font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const err = a.fields[f.key];
          if (f.type === "bool") return <div key={f.key} className="sm:col-span-2"><Toggle label={f.label} checked={!!v[f.key]} onChange={(x) => set(f.key, x)} /></div>;
          if (f.type === "textarea") return <F key={f.key} label={f.label} hint={f.hint} error={err} className="sm:col-span-2"><textarea className={inputCls} rows={5} value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} /></F>;
          if (f.type === "number") return <F key={f.key} label={f.label} hint={f.hint} error={err}><input className={inputCls} inputMode="decimal" value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))} /></F>;
          if (f.type === "list") return <F key={f.key} label={f.label} hint={f.hint} error={err}><input className={inputCls} value={((v[f.key] as string[]) ?? []).join(", ")} onChange={(e) => set(f.key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></F>;
          return <F key={f.key} label={f.label} hint={f.hint} error={err}><input className={inputCls} value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} /></F>;
        })}
      </div>
      <ResultNote result={a.result} />
      <Btn type="submit" variant="accent" pending={a.pending}>Save {title.toLowerCase()}</Btn>
    </form>
  );
}

export function ShippingMethodsForm({ value }: { value: ShopSettings["shipping"] }) {
  const a = useAdminAction();
  const [methods, setMethods] = useState(value.methods);
  const upd = (i: number, patch: Partial<(typeof methods)[number]>) => setMethods((m) => m.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <form className="card space-y-4 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); a.run(() => saveSettingsAction("shipping", { ...value, methods })); }}>
      <h2 className="font-bold">Shipping methods & rates</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase text-muted"><tr><th className="p-1">ID</th><th className="p-1">Label</th><th className="p-1">Rate ₹</th><th className="p-1">Free above ₹</th><th className="p-1">Min days</th><th className="p-1">Max days</th><th className="p-1">On</th><th /></tr></thead>
          <tbody>
            {methods.map((m, i) => (
              <tr key={i}>
                <td className="p-1"><input aria-label="ID" className="input w-24 py-1.5 font-mono text-xs" value={m.id} onChange={(e) => upd(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} /></td>
                <td className="p-1"><input aria-label="Label" className="input py-1.5 text-sm" value={m.label} onChange={(e) => upd(i, { label: e.target.value })} /></td>
                <td className="p-1"><input aria-label="Rate" className="input w-20 py-1.5 text-sm" inputMode="decimal" value={m.rate} onChange={(e) => upd(i, { rate: Number(e.target.value) || 0 })} /></td>
                <td className="p-1"><input aria-label="Free above" className="input w-24 py-1.5 text-sm" inputMode="decimal" placeholder="Never" value={m.freeAbove ?? ""} onChange={(e) => upd(i, { freeAbove: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                <td className="p-1"><input aria-label="Min days" className="input w-16 py-1.5 text-sm" inputMode="numeric" value={m.minDays} onChange={(e) => upd(i, { minDays: Number(e.target.value) || 0 })} /></td>
                <td className="p-1"><input aria-label="Max days" className="input w-16 py-1.5 text-sm" inputMode="numeric" value={m.maxDays} onChange={(e) => upd(i, { maxDays: Number(e.target.value) || 0 })} /></td>
                <td className="p-2"><input aria-label="Enabled" type="checkbox" className="h-4 w-4" checked={m.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /></td>
                <td className="p-1"><button type="button" aria-label="Remove" disabled={methods.length === 1} onClick={() => setMethods((x) => x.filter((_, n) => n !== i))} className="rounded p-1.5 text-muted hover:text-danger disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Btn variant="outline" onClick={() => setMethods((m) => [...m, { id: `method${m.length + 1}`, label: "New method", rate: 0, freeAbove: null, minDays: 3, maxDays: 7, enabled: true }])}><Plus className="h-4 w-4" /> Add method</Btn>
      <ResultNote result={a.result} />
      <Btn type="submit" variant="accent" pending={a.pending}>Save shipping methods</Btn>
    </form>
  );
}

export { SECTIONS as SETTINGS_SECTIONS };
