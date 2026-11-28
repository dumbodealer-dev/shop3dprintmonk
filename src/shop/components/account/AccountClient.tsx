"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, LoaderCircle, LogOut, MapPin, Package, ShieldCheck, Trash2, User } from "lucide-react";
import { shopHref } from "@/shop/config";
import { api, ApiError } from "../api";
import { AddressFields, emptyAddress, type AddressValue } from "../checkout/AddressFields";
import { useShop } from "../ShopProvider";
import { Badge, Notice } from "../ui";

const NAV = [
  { href: "/account", label: "Overview", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/security", label: "Profile & security", icon: ShieldCheck },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="card p-2">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {NAV.map(({ href, label, icon: Icon }) => {
          const h = shopHref(href);
          const active = href === "/account" ? path === h : path.startsWith(h);
          return (
            <li key={href}>
              <Link href={h} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-ink-900 text-white" : "hover:bg-paper"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            </li>
          );
        })}
        <li><LogoutButton /></li>
      </ul>
    </nav>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const { refreshCart } = useShop();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); await api("/account/logout", { method: "POST", body: {} }).catch(() => {}); await refreshCart(); router.push(shopHref("/")); router.refresh(); }} className="flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-paper hover:text-danger">
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
    </button>
  );
}

export function ResendVerification() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return msg ? <span>{msg}</span> : (
    <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setMsg((await api<{ message: string }>("/account/resend-verification", { method: "POST", body: {} })).message); } catch (e) { setMsg(e instanceof ApiError ? e.message : "Please try again later."); } }} className="font-semibold underline">
      Resend verification email
    </button>
  );
}

export type AddressRow = { id: string; label: string | null; full_name: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string; is_default_shipping: boolean; is_default_billing: boolean };

export function AddressBook({ initial }: { initial: AddressRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; value: AddressValue; label: string; ship: boolean; bill: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toValue = (a: AddressRow): AddressValue => ({ fullName: a.full_name, phone: a.phone.replace(/^\+91/, ""), line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, pincode: a.pincode });

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const body = { ...editing.value, id: editing.id ?? undefined, label: editing.label, isDefaultShipping: editing.ship, isDefaultBilling: editing.bill };
      await api("/account/addresses", { method: editing.id ? "PATCH" : "POST", body });
      setEditing(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setErrors(Object.fromEntries(Object.entries(e.fields ?? {}).map(([k, v]) => [`a.${k}`, v])));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {initial.map((a) => (
          <div key={a.id} className="card p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{a.label ?? a.full_name}</p>
              {a.is_default_shipping && <Badge tone="dark">Default shipping</Badge>}
              {a.is_default_billing && <Badge>Default billing</Badge>}
            </div>
            <p className="mt-2 leading-relaxed text-muted">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" className="font-semibold text-accent-ink hover:underline" onClick={() => { setErrors({}); setEditing({ id: a.id, value: toValue(a), label: a.label ?? "", ship: a.is_default_shipping, bill: a.is_default_billing }); }}>Edit</button>
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-muted hover:text-danger" onClick={async () => { if (confirm("Delete this address?")) { await api(`/account/addresses?id=${a.id}`, { method: "DELETE" }); router.refresh(); } }}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        ))}
        {!editing && (
          <button type="button" onClick={() => { setErrors({}); setEditing({ id: null, value: emptyAddress(), label: "", ship: initial.length === 0, bill: initial.length === 0 }); }} className="flex min-h-40 items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-accent hover:text-accent-ink">
            + Add a new address
          </button>
        )}
      </div>
      {editing && (
        <form className="card space-y-5 p-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <h2 className="text-lg font-bold">{editing.id ? "Edit address" : "New address"}</h2>
          {error && <Notice tone="danger">{error}</Notice>}
          <div>
            <label htmlFor="addr-label" className="field-label">Label <span className="font-normal text-muted">(optional)</span></label>
            <input id="addr-label" className="input" placeholder="Home, Office…" maxLength={40} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
          </div>
          <AddressFields prefix="a" value={editing.value} onChange={(v) => setEditing({ ...editing, value: v })} errors={errors} />
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={editing.ship} onChange={(e) => setEditing({ ...editing, ship: e.target.checked })} /> Default shipping address</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={editing.bill} onChange={(e) => setEditing({ ...editing, bill: e.target.checked })} /> Default billing address</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-6 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Save address</button>
            <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full border border-line px-6 font-semibold">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ProfileForm({ initial }: { initial: { fullName: string; phone: string; marketingOptIn: boolean } }) {
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="card space-y-4 p-6" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null); try { await api("/account/profile", { method: "PATCH", body: f }); setMsg({ ok: true, text: "Profile saved." }); } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Couldn't save." }); } finally { setBusy(false); } }}>
      <h2 className="text-lg font-bold">Profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="p-name" className="field-label">Full name</label><input id="p-name" className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required autoComplete="name" /></div>
        <div><label htmlFor="p-phone" className="field-label">Mobile number</label><input id="p-phone" className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></div>
      </div>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--color-accent-ink)]" checked={f.marketingOptIn} onChange={(e) => setF({ ...f, marketingOptIn: e.target.checked })} /> Email me about new products and offers</label>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-6 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Save profile</button>
    </form>
  );
}

export function PasswordForm() {
  const [f, setF] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="card space-y-4 p-6" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null); try { await api("/account/password", { body: f }); setF({ current: "", next: "" }); setMsg({ ok: true, text: "Password changed. Other devices have been signed out." }); } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Couldn't change password." }); } finally { setBusy(false); } }}>
      <h2 className="text-lg font-bold">Change password</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="pw-c" className="field-label">Current password</label><input id="pw-c" type="password" className="input" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required autoComplete="current-password" /></div>
        <div><label htmlFor="pw-n" className="field-label">New password</label><input id="pw-n" type="password" className="input" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required minLength={8} autoComplete="new-password" /><p className="field-hint">At least 8 characters, with letters and a number</p></div>
      </div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-6 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Change password</button>
    </form>
  );
}

export function DeleteAccount({ requestedAt }: { requestedAt: string | null }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (cancel: boolean) => {
    setBusy(true);
    await api("/account/delete-request", { body: { reason, cancel } }).catch(() => {});
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="card space-y-4 border-red-200 p-6">
      <h2 className="text-lg font-bold">Delete my account</h2>
      {requestedAt ? (
        <>
          <Notice tone="warning">You requested deletion on {new Date(requestedAt).toLocaleDateString("en-IN")}. Our team will complete it within 7 days and email you. Order and invoice records are kept as required by Indian tax law.</Notice>
          <button type="button" disabled={busy} onClick={() => send(true)} className="h-11 rounded-full border border-line px-5 font-semibold">Withdraw request</button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">We&apos;ll delete your profile, saved addresses, wishlist and reviews. Invoices for past orders are retained for GST compliance.</p>
          <label htmlFor="del-reason" className="field-label">Reason <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="del-reason" className="input" rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" disabled={busy} onClick={() => confirm("Request account deletion?") && send(false)} className="inline-flex h-11 items-center gap-2 rounded-full bg-danger px-5 font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Request deletion</button>
        </>
      )}
    </div>
  );
}
