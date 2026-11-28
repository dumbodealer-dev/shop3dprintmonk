"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatINR } from "@/shop/lib/money";
import {
  adjustStockAction, customerNotesAction, customerStatusAction, deleteCategoryAction, deleteCouponAction, inviteAdminAction, moderateReviewAction,
  processDeletionAction, revokeAdminSessionsAction, saveCategoryAction, saveCouponAction, updateAdminAction,
} from "@/shop/server/admin/actions";
import { Badge } from "../ui";
import { Btn, F, inputCls, ResultNote, Toggle, useAdminAction } from "./kit";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

// ── Categories ───────────────────────────────────────────────────────────
export type CategoryRow = { id: string; name: string; slug: string; description: string | null; parent_id: string | null; image_url: string | null; sort_order: number; is_active: boolean; products: number };

export function CategoryManager({ rows }: { rows: CategoryRow[] }) {
  const a = useAdminAction();
  const empty = { id: null as string | null, name: "", slug: "", description: "", parentId: "", imageUrl: "", sortOrder: "100", isActive: true };
  const [f, setF] = useState(empty);
  const roots = rows.filter((r) => !r.parent_id);
  const ordered = roots.flatMap((r) => [r, ...rows.filter((c) => c.parent_id === r.id)]);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">Category</th><th className="p-3">Slug</th><th className="p-3 text-right">Products</th><th className="p-3" /></tr></thead>
          <tbody>
            {ordered.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-semibold">{c.parent_id && <span className="mr-2 text-muted">└</span>}{c.name} {!c.is_active && <Badge>Hidden</Badge>}</td>
                <td className="p-3 font-mono text-xs text-muted">{c.slug}</td>
                <td className="p-3 text-right">{c.products}</td>
                <td className="p-3 text-right">
                  <button type="button" className="mr-3 text-muted hover:text-text" aria-label={`Edit ${c.name}`} onClick={() => setF({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", parentId: c.parent_id ?? "", imageUrl: c.image_url ?? "", sortOrder: String(c.sort_order), isActive: c.is_active })}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="text-muted hover:text-danger" aria-label={`Delete ${c.name}`} onClick={() => a.run(() => deleteCategoryAction(c.id), { confirm: `Delete “${c.name}”? Products in it become uncategorised.` })}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="p-8 text-center text-muted">No categories yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => saveCategoryAction(f), { onOk: () => setF(empty) }); }}>
        <h2 className="font-bold">{f.id ? "Edit category" : "New category"}</h2>
        <ResultNote result={a.result} />
        <F label="Name" error={a.fields.name}><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></F>
        <F label="Slug" hint="Leave empty to generate" error={a.fields.slug}><input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></F>
        <F label="Parent (for a subcategory)"><select className={inputCls} value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}><option value="">— Top level —</option>{roots.filter((r) => r.id !== f.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></F>
        <F label="Description"><textarea className={inputCls} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        <F label="Image URL" hint="Upload in a product first, or paste a public image link"><input className={inputCls} value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} /></F>
        <F label="Sort order"><input className={inputCls} inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value })} /></F>
        <Toggle label="Visible in the store" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
        <div className="flex gap-2"><Btn type="submit" variant="accent" pending={a.pending}>Save</Btn>{f.id && <Btn variant="outline" onClick={() => setF(empty)}>New instead</Btn>}</div>
      </form>
    </div>
  );
}

// ── Discounts ────────────────────────────────────────────────────────────
export type CouponRow = {
  id: string; code: string; description: string | null; type: "percent" | "fixed" | "free_shipping"; value: number; max_discount: number | null; min_order_value: number;
  applies_to: "all" | "products" | "categories"; product_ids: string[]; category_ids: string[]; starts_at: string | null; ends_at: string | null;
  usage_limit: number | null; per_customer_limit: number | null; first_order_only: boolean; free_shipping: boolean; is_active: boolean; used_count: number;
};

export function CouponManager({ rows, products, categories }: { rows: CouponRow[]; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const a = useAdminAction();
  const empty = { id: null as string | null, code: "", description: "", type: "percent" as CouponRow["type"], value: "10", maxDiscount: "", minOrderValue: "0", appliesTo: "all" as CouponRow["applies_to"], productIds: [] as string[], categoryIds: [] as string[], startsAt: "", endsAt: "", usageLimit: "", perCustomerLimit: "", firstOrderOnly: false, freeShipping: false, isActive: true };
  const [f, setF] = useState(empty);
  const edit = (c: CouponRow) => setF({ id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: String(c.value), maxDiscount: c.max_discount == null ? "" : String(c.max_discount), minOrderValue: String(c.min_order_value), appliesTo: c.applies_to, productIds: c.product_ids, categoryIds: c.category_ids, startsAt: toLocal(c.starts_at), endsAt: toLocal(c.ends_at), usageLimit: c.usage_limit == null ? "" : String(c.usage_limit), perCustomerLimit: c.per_customer_limit == null ? "" : String(c.per_customer_limit), firstOrderOnly: c.first_order_only, freeShipping: c.free_shipping, isActive: c.is_active });
  const [now] = useState(() => Date.now());
  const state = (c: CouponRow) => (!c.is_active ? "Inactive" : c.ends_at && Date.parse(c.ends_at) < now ? "Expired" : c.starts_at && Date.parse(c.starts_at) > now ? "Scheduled" : c.usage_limit != null && c.used_count >= c.usage_limit ? "Used up" : "Active");
  const pick = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_420px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Conditions</th><th className="p-3 text-right">Used</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-mono font-semibold">{c.code}<span className="block font-sans text-xs font-normal text-muted">{c.description}</span></td>
                <td className="p-3">{c.type === "percent" ? `${c.value}%${c.max_discount ? ` (max ${formatINR(c.max_discount)})` : ""}` : c.type === "fixed" ? formatINR(c.value) : "Free shipping"}{c.free_shipping && c.type !== "free_shipping" ? " + free shipping" : ""}</td>
                <td className="p-3 text-xs text-muted">{[c.min_order_value > 0 && `Min ${formatINR(c.min_order_value)}`, c.applies_to !== "all" && `${c.applies_to} only`, c.first_order_only && "First order", c.per_customer_limit && `${c.per_customer_limit}/customer`, c.ends_at && `Ends ${new Date(c.ends_at).toLocaleDateString("en-IN")}`].filter(Boolean).join(" · ") || "—"}</td>
                <td className="p-3 text-right">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="p-3"><Badge tone={state(c) === "Active" ? "success" : "neutral"}>{state(c)}</Badge></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button type="button" className="mr-3 text-muted hover:text-text" aria-label={`Edit ${c.code}`} onClick={() => edit(c)}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className="text-muted hover:text-danger" aria-label={`Delete ${c.code}`} onClick={() => a.run(() => deleteCouponAction(c.id), { confirm: `Delete ${c.code}?` })}><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-8 text-center text-muted">No discount codes yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => saveCouponAction({ ...f, startsAt: toIso(f.startsAt), endsAt: toIso(f.endsAt) }), { onOk: () => setF(empty) }); }}>
        <h2 className="font-bold">{f.id ? `Edit ${f.code}` : "New discount code"}</h2>
        <ResultNote result={a.result} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Code" error={a.fields.code}><input className={`${inputCls} font-mono uppercase`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} required /></F>
          <F label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as CouponRow["type"] })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free shipping</option></select></F>
          {f.type !== "free_shipping" && <F label={f.type === "percent" ? "Percent off" : "Amount off (₹)"} error={a.fields.value}><input className={inputCls} inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></F>}
          {f.type === "percent" && <F label="Max discount ₹" hint="Optional cap"><input className={inputCls} inputMode="decimal" value={f.maxDiscount} onChange={(e) => setF({ ...f, maxDiscount: e.target.value })} /></F>}
          <F label="Minimum order ₹"><input className={inputCls} inputMode="decimal" value={f.minOrderValue} onChange={(e) => setF({ ...f, minOrderValue: e.target.value })} /></F>
          <F label="Applies to"><select className={inputCls} value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value as CouponRow["applies_to"] })}><option value="all">Whole cart</option><option value="products">Specific products</option><option value="categories">Specific categories</option></select></F>
        </div>
        {f.appliesTo === "products" && <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-3">{products.map((p) => <Toggle key={p.id} label={p.name} checked={f.productIds.includes(p.id)} onChange={(on) => setF({ ...f, productIds: pick(f.productIds, p.id, on) })} />)}</div>}
        {f.appliesTo === "categories" && <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-3">{categories.map((c) => <Toggle key={c.id} label={c.name} checked={f.categoryIds.includes(c.id)} onChange={(on) => setF({ ...f, categoryIds: pick(f.categoryIds, c.id, on) })} />)}</div>}
        <div className="grid grid-cols-2 gap-3">
          <F label="Starts"><input type="datetime-local" className={inputCls} value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></F>
          <F label="Ends" error={a.fields.endsAt}><input type="datetime-local" className={inputCls} value={f.endsAt} onChange={(e) => setF({ ...f, endsAt: e.target.value })} /></F>
          <F label="Total uses"><input className={inputCls} inputMode="numeric" placeholder="Unlimited" value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: e.target.value })} /></F>
          <F label="Uses per customer"><input className={inputCls} inputMode="numeric" placeholder="Unlimited" value={f.perCustomerLimit} onChange={(e) => setF({ ...f, perCustomerLimit: e.target.value })} /></F>
        </div>
        <F label="Description (internal / shown in cart)"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        <Toggle label="First order only" checked={f.firstOrderOnly} onChange={(v) => setF({ ...f, firstOrderOnly: v })} />
        {f.type !== "free_shipping" && <Toggle label="Also give free shipping" checked={f.freeShipping} onChange={(v) => setF({ ...f, freeShipping: v })} />}
        <Toggle label="Active" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
        <div className="flex gap-2"><Btn type="submit" variant="accent" pending={a.pending}>Save discount</Btn>{f.id && <Btn variant="outline" onClick={() => setF(empty)}>New instead</Btn>}</div>
      </form>
    </div>
  );
}

// ── Inventory ────────────────────────────────────────────────────────────
export function StockAdjuster({ variantId, stock }: { variantId: string; stock: number }) {
  const a = useAdminAction();
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  return (
    <form className="flex flex-wrap items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); a.run(() => adjustStockAction({ variantId, mode, quantity: qty, reason: mode === "add" ? "restock" : "adjustment", note }), { onOk: () => { setQty(""); setNote(""); } }); }}>
      <select aria-label="Adjustment type" className="input h-8 w-24 py-0 text-xs" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="add">+ Add</option><option value="remove">− Remove</option><option value="set">= Set</option></select>
      <input aria-label="Quantity" className="input h-8 w-16 py-0 text-xs" inputMode="numeric" placeholder={mode === "set" ? String(stock) : "Qty"} value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} required />
      <input aria-label="Note" className="input h-8 w-32 py-0 text-xs" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <Btn type="submit" variant="outline" className="h-8 px-3 text-xs" pending={a.pending}>Apply</Btn>
      {a.result && <span className={`text-xs ${a.result.ok ? "text-success" : "text-danger"}`}>{a.result.ok ? a.result.message : a.result.error}</span>}
    </form>
  );
}

// ── Customers ────────────────────────────────────────────────────────────
export function CustomerAdminActions({ id, status, notes, deletionRequested }: { id: string; status: string; notes: string; deletionRequested: boolean }) {
  const a = useAdminAction();
  const [n, setN] = useState(notes);
  return (
    <div className="space-y-4">
      <ResultNote result={a.result} />
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Internal notes</h2>
        <textarea className={inputCls} rows={4} value={n} onChange={(e) => setN(e.target.value)} />
        <Btn variant="outline" pending={a.pending} onClick={() => a.run(() => customerNotesAction(id, n))}>Save notes</Btn>
      </div>
      {status !== "deleted" && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">Account status</h2>
          {status === "active" ? (
            <Btn variant="danger" pending={a.pending} onClick={() => a.run(() => customerStatusAction(id, "suspended"), { confirm: "Suspend this account? They'll be signed out and can't sign in." })}>Suspend account</Btn>
          ) : (
            <Btn variant="outline" pending={a.pending} onClick={() => a.run(() => customerStatusAction(id, "active"))}>Re-activate account</Btn>
          )}
          <div className="border-t border-line pt-3">
            <p className="text-sm text-muted">{deletionRequested ? "The customer asked for their account to be deleted." : "Erase personal data (DPDP request). Orders are kept for tax records."}</p>
            <Btn variant="danger" className="mt-2" pending={a.pending} onClick={() => a.run(() => processDeletionAction(id), { confirm: "Permanently erase this customer's personal data? This cannot be undone." })}>Erase customer data</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reviews ──────────────────────────────────────────────────────────────
export function ReviewModeration({ id, status }: { id: string; status: string }) {
  const a = useAdminAction();
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "approved" && <Btn variant="accent" className="h-8 px-3 text-xs" pending={a.pending} onClick={() => a.run(() => moderateReviewAction(id, "approved"))}>Approve</Btn>}
      {status !== "rejected" && <Btn variant="outline" className="h-8 px-3 text-xs" pending={a.pending} onClick={() => a.run(() => moderateReviewAction(id, "rejected"))}>Reject</Btn>}
      {a.result && !a.result.ok && <span className="text-xs text-danger">{a.result.error}</span>}
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────────────────
export function TeamManager({ rows, meId }: { rows: { id: string; email: string; full_name: string; role: string; status: string; last_login_at: string | null }[]; meId: string }) {
  const a = useAdminAction();
  const [f, setF] = useState({ email: "", fullName: "", role: "staff" });
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <ResultNote result={a.result} />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">Member</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last sign-in</th><th className="p-3" /></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="p-3 font-semibold">{m.full_name}{m.id === meId && <span className="ml-1 text-xs text-muted">(you)</span>}<span className="block text-xs font-normal text-muted">{m.email}</span></td>
                  <td className="p-3"><select aria-label="Role" className="input h-8 w-28 py-0 text-xs" defaultValue={m.role} onChange={(e) => a.run(() => updateAdminAction(m.id, { role: e.target.value, status: m.status }))}>{["owner", "manager", "staff"].map((r) => <option key={r}>{r}</option>)}</select></td>
                  <td className="p-3"><Badge tone={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge></td>
                  <td className="p-3 text-muted">{m.last_login_at ? new Date(m.last_login_at).toLocaleString("en-IN") : "Never"}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button type="button" className="mr-3 text-xs font-semibold text-muted hover:text-text" onClick={() => a.run(() => revokeAdminSessionsAction(m.id))}>Sign out sessions</button>
                    <button type="button" className="text-xs font-semibold text-muted hover:text-danger" onClick={() => a.run(() => updateAdminAction(m.id, { role: m.role, status: m.status === "active" ? "disabled" : "active" }), { confirm: m.status === "active" ? `Disable ${m.full_name}?` : undefined })}>{m.status === "active" ? "Disable" : "Enable"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5 text-sm text-muted">
          <p><strong className="text-text">Owner</strong> — everything, including team and store settings.</p>
          <p className="mt-1"><strong className="text-text">Manager</strong> — products, orders, refunds, customers, inventory, discounts, content, reviews.</p>
          <p className="mt-1"><strong className="text-text">Staff</strong> — dashboard, products, orders (no refunds), inventory, reviews.</p>
        </div>
      </div>
      <form className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); a.run(() => inviteAdminAction(f), { onOk: () => setF({ email: "", fullName: "", role: "staff" }) }); }}>
        <h2 className="font-bold">Invite a team member</h2>
        <F label="Name"><input className={inputCls} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required /></F>
        <F label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></F>
        <F label="Role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select></F>
        <Btn type="submit" variant="accent" pending={a.pending}><Plus className="h-4 w-4" /> Send invite</Btn>
        <p className="text-xs text-muted">They receive an email link to set their own password.</p>
      </form>
    </div>
  );
}
