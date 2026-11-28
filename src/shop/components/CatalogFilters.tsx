"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, SlidersHorizontal, X } from "lucide-react";

type Props = {
  sorts: Record<string, string>;
  materials: string[];
  categories?: { slug: string; name: string; href: string; active: boolean }[];
};

/** Filters & sorting live in the URL, so results are shareable, crawlable and survive reloads. */
export function CatalogFilters({ sorts, materials, categories, part }: Props & { part: "toolbar" | "sidebar" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  const active = ["stock", "sale", "material", "tech", "min", "max"].filter((k) => params.get(k));
  const panel = (
    <div className="space-y-7">
      {categories && categories.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">Category</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {categories.map((c) => (
              <li key={c.slug}><a href={c.href} className={c.active ? "font-semibold text-accent-ink" : "text-muted hover:text-text"}>{c.name}</a></li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold">Availability</h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={params.get("stock") === "1"} onChange={(e) => update({ stock: e.target.checked ? "1" : null })} /> In stock only
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent-ink)]" checked={params.get("sale") === "1"} onChange={(e) => update({ sale: e.target.checked ? "1" : null })} /> On sale
        </label>
      </div>
      <div>
        <h3 className="text-sm font-bold">Price (₹)</h3>
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); update({ min, max }); }}>
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" className="input h-10 py-0 text-sm" />
          <span className="text-muted">–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" className="input h-10 py-0 text-sm" />
          <button type="submit" className="h-10 rounded-full bg-ink-900 px-3 text-sm font-semibold text-white">Go</button>
        </form>
      </div>
      <div>
        <h3 className="text-sm font-bold">Printing technology</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["", "Any"], ["fdm", "FDM"], ["sla", "Resin (SLA)"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => update({ tech: v || null })} aria-pressed={(params.get("tech") ?? "") === v} className={`h-9 rounded-full border px-3.5 text-sm ${(params.get("tech") ?? "") === v ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-ink-300"}`}>{l}</button>
          ))}
        </div>
      </div>
      {materials.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">Material</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {materials.map((m) => (
              <button key={m} type="button" onClick={() => update({ material: params.get("material") === m ? null : m })} aria-pressed={params.get("material") === m} className={`h-9 rounded-full border px-3.5 text-sm ${params.get("material") === m ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-ink-300"}`}>{m}</button>
            ))}
          </div>
        </div>
      )}
      {active.length > 0 && (
        <button type="button" onClick={() => { setMin(""); setMax(""); update(Object.fromEntries(active.map((k) => [k, null]))); }} className="text-sm font-semibold text-accent-ink underline underline-offset-4">Clear all filters</button>
      )}
    </div>
  );

  if (part === "sidebar") return <div className="hidden lg:block">{panel}</div>;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold lg:hidden">
          <SlidersHorizontal className="h-4 w-4" /> Filters {active.length > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-ink-950">{active.length}</span>}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-label="Updating results" />}
          <label htmlFor="sort" className="text-sm text-muted">Sort</label>
          <select id="sort" value={params.get("sort") ?? (params.get("q") ? "relevance" : "popular")} onChange={(e) => update({ sort: e.target.value })} className="h-10 rounded-full border border-line bg-white px-3 text-sm font-semibold">
            {Object.entries(sorts).filter(([k]) => k !== "relevance" || params.get("q")).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} aria-label="Close filters" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-paper" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {panel}
            <button type="button" onClick={() => setOpen(false)} className="mt-8 h-12 w-full rounded-full bg-ink-900 font-semibold text-white">Show results</button>
          </div>
        </div>
      )}
    </>
  );
}
