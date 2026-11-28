"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  BarChart3, Boxes, FolderTree, Image as ImageIcon, LoaderCircle, LogOut, Menu, MessageSquare, Package, Percent, Settings, ShoppingCart, Users, UserCog, Warehouse, X,
} from "lucide-react";
import { shopHref } from "@/shop/config";
import type { ActionResult } from "@/shop/server/admin/action";

const NAV = [
  { href: "", label: "Dashboard", icon: BarChart3, perm: "dashboard" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, perm: "orders" },
  { href: "/products", label: "Products", icon: Package, perm: "products" },
  { href: "/categories", label: "Categories", icon: FolderTree, perm: "products" },
  { href: "/inventory", label: "Inventory", icon: Warehouse, perm: "inventory" },
  { href: "/customers", label: "Customers", icon: Users, perm: "customers" },
  { href: "/discounts", label: "Discounts", icon: Percent, perm: "discounts" },
  { href: "/content", label: "Homepage & content", icon: ImageIcon, perm: "content" },
  { href: "/reviews", label: "Reviews", icon: MessageSquare, perm: "reviews" },
  { href: "/team", label: "Team & roles", icon: UserCog, perm: "team" },
  { href: "/settings", label: "Store settings", icon: Settings, perm: "settings" },
] as const;

export function AdminShell({ admin, perms, logout, children }: { admin: { fullName: string; role: string }; perms: string[]; logout: () => Promise<void>; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const base = shopHref("/admin");
  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link href={base} className="flex items-center gap-2 px-5 py-5 font-extrabold tracking-[0.06em] text-white">
        <Boxes className="h-6 w-6 text-accent" /> 3D PRINT<span className="-ml-2 text-accent">MONK</span> <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-widest">ADMIN</span>
      </Link>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.filter((n) => perms.includes(n.perm)).map(({ href, label, icon: Icon }) => {
          const h = `${base}${href}`;
          const active = href === "" ? path === base : path.startsWith(h);
          return (
            <li key={href}>
              <Link href={h} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-accent text-ink-950" : "text-ink-200 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4 text-sm">
        <p className="font-semibold text-white">{admin.fullName}</p>
        <p className="capitalize text-ink-400">{admin.role}</p>
        <div className="mt-3 flex gap-3">
          <a href={shopHref("/")} target="_blank" rel="noopener" className="text-ink-300 hover:text-white">View store ↗</a>
          <form action={logout}><button type="submit" className="inline-flex items-center gap-1 text-ink-300 hover:text-white"><LogOut className="h-3.5 w-3.5" /> Sign out</button></form>
        </div>
      </div>
    </nav>
  );
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-ink-900 lg:block">{nav}</aside>
      <div className="flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 text-white" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button>
        <span className="font-bold text-white">Admin</span>
        <span className="w-9" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-72 bg-ink-900">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-full p-2 text-white" aria-label="Close"><X className="h-5 w-5" /></button>
            {nav}
          </div>
        </div>
      )}
      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Runs a server action, shows its message, refreshes server data. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  function run<T>(fn: () => Promise<ActionResult<T>>, opts: { onOk?: (r: ActionResult<T> & { ok: true }) => void; confirm?: string } = {}) {
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    start(async () => {
      const r = await fn();
      setResult(r as ActionResult<unknown>);
      if (r.ok) {
        opts.onOk?.(r as ActionResult<T> & { ok: true });
        router.refresh();
      }
    });
  }
  return { pending, result, run, clear: () => setResult(null), fields: result && !result.ok ? (result.fields ?? {}) : {} };
}

export function ResultNote({ result }: { result: ActionResult<unknown> | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`rounded-xl px-4 py-2.5 text-sm ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
      {result.ok ? (result.message ?? "Saved.") : result.error}
      {!result.ok && result.fields && Object.keys(result.fields).length > 0 && (
        <span className="mt-1 block text-xs">{Object.entries(result.fields).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
      )}
    </p>
  );
}

export function Btn({ children, variant = "dark", pending, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "dark" | "accent" | "outline" | "danger"; pending?: boolean }) {
  const v = { dark: "bg-ink-900 text-white hover:bg-ink-700", accent: "bg-accent text-ink-950 hover:bg-accent-soft", outline: "border border-line bg-white hover:bg-paper", danger: "border border-red-200 bg-white text-danger hover:bg-red-50" }[variant];
  return (
    <button type="button" disabled={pending || props.disabled} className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-60 ${v} ${className}`} {...props}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

export function F({ label, error, hint, children, className = "" }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error block">{error}</span> : hint ? <span className="field-hint block">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

export const inputCls = "input py-2 text-sm";
