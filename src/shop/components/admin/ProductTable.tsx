"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { bulkProductStatusAction, deleteProductAction, importProductsAction } from "@/shop/server/admin/actions";
import { Badge, ProductPlaceholder } from "../ui";
import { Btn, ResultNote, useAdminAction } from "./kit";

export type ProductRow = { id: string; name: string; slug: string; status: string; publishAt: string | null; category: string | null; image: string | null; minPrice: number; stock: number; tracked: boolean; variants: number; isFeatured: boolean; isBestseller: boolean };

export function ProductTable({ rows }: { rows: ProductRow[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const a = useAdminAction();
  const file = useRef<HTMLInputElement>(null);
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {sel.size > 0 ? (
          <>
            <span className="text-sm font-semibold">{sel.size} selected</span>
            {(["active", "draft", "archived"] as const).map((s) => (
              <Btn key={s} variant="outline" pending={a.pending} onClick={() => a.run(() => bulkProductStatusAction([...sel], s), { onOk: () => setSel(new Set()) })}>Set {s}</Btn>
            ))}
          </>
        ) : (
          <>
            <a href={shopHref("/admin/api/export?kind=products")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold hover:bg-paper"><Download className="h-4 w-4" /> Export CSV</a>
            <Btn variant="outline" pending={a.pending} onClick={() => file.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Btn>
            <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const fd = new FormData();
              fd.append("file", f);
              a.run(() => importProductsAction(fd), { confirm: `Import ${f.name}? Products are matched by slug and variants by SKU.` });
            }} />
          </>
        )}
      </div>
      <ResultNote result={a.result} />
      {a.result?.ok && Array.isArray((a.result.data as { errors?: string[] })?.errors) && (a.result.data as { errors: string[] }).errors.length > 0 && (
        <ul className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">{(a.result.data as { errors: string[] }).errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 p-3"><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4" /></th>
              <th className="p-3">Product</th><th className="p-3">Status</th><th className="p-3">Category</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Stock</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4" /></td>
                <td className="p-3">
                  <Link href={shopHref(`/admin/products/${r.id}`)} className="flex items-center gap-3 font-semibold hover:text-accent-ink">
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">{r.image ? <Image src={r.image} alt="" fill sizes="44px" className="object-cover" /> : <ProductPlaceholder name={r.name} className="h-full w-full" />}</span>
                    <span>{r.name}<span className="block text-xs font-normal text-muted">{r.variants} variant{r.variants === 1 ? "" : "s"}{r.isFeatured ? " · Featured" : ""}{r.isBestseller ? " · Bestseller" : ""}</span></span>
                  </Link>
                </td>
                <td className="p-3">
                  <Badge tone={r.status === "active" ? (r.publishAt && new Date(r.publishAt) > new Date() ? "info" : "success") : r.status === "draft" ? "neutral" : "dark"}>
                    {r.status === "active" && r.publishAt && new Date(r.publishAt) > new Date() ? "Scheduled" : r.status}
                  </Badge>
                </td>
                <td className="p-3 text-muted">{r.category ?? "—"}</td>
                <td className="p-3 text-right">{formatINR(r.minPrice)}</td>
                <td className={`p-3 text-right font-semibold ${r.tracked && r.stock === 0 ? "text-danger" : ""}`}>{r.tracked ? r.stock : "∞"}</td>
                <td className="p-3 text-right">
                  <button type="button" onClick={() => a.run(() => deleteProductAction(r.id), { confirm: `Delete “${r.name}”? Products with orders are archived instead.` })} className="text-xs font-semibold text-muted hover:text-danger">Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-muted">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
