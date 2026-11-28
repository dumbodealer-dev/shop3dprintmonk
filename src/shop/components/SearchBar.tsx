"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { api } from "./api";

type Suggestions = { products: { slug: string; name: string; price: number; imageUrl: string | null }[]; categories: { slug: string; name: string }[] };

/** Search with live product suggestions (keyboard accessible combobox). */
export function SearchBar({ initial = "", className = "", autoFocus = false }: { initial?: string; className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Suggestions | null>(null);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrap = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api<Suggestions>(`/search?q=${encodeURIComponent(term)}`);
        if (!ctrl.cancelled) {
          setData(r);
          setActive(-1);
        }
      } catch {
        /* ignore */
      } finally {
        if (!ctrl.cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items = q.trim().length >= 2 && data ? [...data.categories.map((c) => ({ href: shopHref(`/category/${c.slug}`), label: c.name, kind: "category" as const })), ...data.products.map((p) => ({ href: shopHref(`/products/${p.slug}`), label: p.name, kind: "product" as const, p }))] : [];

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <form
      ref={wrap}
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) return go(items[active].href);
        go(shopHref(`/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`));
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">Search products</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
      <input
        id={`${listId}-input`}
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Search planters, lamps, gifts…"
        className="h-11 w-full rounded-full border border-ink-700 bg-ink-850 pl-10 pr-10 text-sm text-white placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(items.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {loading && <LoaderCircle className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-400" aria-hidden="true" />}
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-line bg-white p-2 text-text shadow-2xl">
          {items.map((it, i) => (
            <li key={it.href} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(it.href)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${active === i ? "bg-paper" : "hover:bg-paper"}`}>
                {it.kind === "product" ? (
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-900">{it.p.imageUrl && <Image src={it.p.imageUrl} alt="" fill sizes="40px" className="object-cover" />}</span>
                ) : (
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-2 font-mono text-[0.6rem] uppercase text-muted">Cat</span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                {it.kind === "product" && <span className="font-semibold">{formatINR(it.p.price)}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-line px-3 pb-1 pt-2">
            <button type="submit" className="text-sm font-semibold text-accent-ink hover:underline">See all results for “{q.trim()}”</button>
          </li>
        </ul>
      )}
    </form>
  );
}
