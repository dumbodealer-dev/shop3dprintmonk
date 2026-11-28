"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Box, ExternalLink, GripVertical, ImagePlus, LoaderCircle, Plus, Trash2, Wand2 } from "lucide-react";
import { shopHref } from "@/shop/config";
import { slugify } from "@/shop/lib/slug";
import type { CustomizationOption } from "@/shop/lib/types";
import { saveProductAction } from "@/shop/server/admin/actions";
import { Btn, F, inputCls, ResultNote, Toggle, useAdminAction } from "./kit";

export type EditorVariant = { id?: string | null; sku: string; title: string; options: Record<string, string>; price: string; salePrice: string; stock: string; trackInventory: boolean; lowStockThreshold: string; weightG: string; isActive: boolean };
export type EditorImage = { id?: string | null; url: string; storagePath?: string | null; alt: string };
export type EditorProduct = {
  id?: string | null; name: string; slug: string; shortDescription: string; description: string; categoryId: string; status: "draft" | "active" | "archived"; publishAt: string;
  printTechnology: string; material: string; finish: string; colors: string; lengthMm: string; widthMm: string; heightMm: string; weightG: string; hsnCode: string; gstRate: string;
  specifications: { label: string; value: string }[]; customization: CustomizationOption[]; leadTimeDays: string; isFeatured: boolean; isBestseller: boolean; isNew: boolean; tags: string;
  modelUrl: string; seoTitle: string; seoDescription: string; images: EditorImage[]; variants: EditorVariant[]; collectionIds: string[]; optionNames: string[];
};

/** ISO timestamp → value for <input type=datetime-local> in the admin's own timezone. */
const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const blankVariant = (): EditorVariant => ({ sku: "", title: "Default", options: {}, price: "", salePrice: "", stock: "0", trackInventory: true, lowStockThreshold: "5", weightG: "", isActive: true });

async function upload(file: File, folder: string): Promise<{ url: string; path: string }> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch(shopHref("/admin/api/upload"), { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; path?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return { url: data.url, path: data.path! };
}

export function ProductEditor({ initial, categories, collections }: { initial: EditorProduct; categories: { id: string; name: string; depth: number }[]; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(() => ({ ...initial, publishAt: toLocalInput(initial.publishAt) }));
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [axisValues, setAxisValues] = useState<Record<string, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const a = useAdminAction();
  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => setP((x) => ({ ...x, [k]: v }));
  const fe = a.fields;

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploadErr(null);
    for (const f of Array.from(files).slice(0, 20 - p.images.length)) {
      setUploading(f.name);
      try {
        const r = await upload(f, "products");
        setP((x) => ({ ...x, images: [...x.images, { url: r.url, storagePath: r.path, alt: x.name }] }));
      } catch (e) {
        setUploadErr(`${f.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    setUploading(null);
  }
  const moveImage = (from: number, to: number) => setP((x) => {
    if (to < 0 || to >= x.images.length) return x;
    const imgs = [...x.images];
    const [m] = imgs.splice(from, 1);
    imgs.splice(to, 0, m);
    return { ...x, images: imgs };
  });

  const setVariant = (i: number, patch: Partial<EditorVariant>) => setP((x) => ({ ...x, variants: x.variants.map((v, n) => (n === i ? { ...v, ...patch } : v)) }));
  function generateVariants() {
    const axes = p.optionNames.map((n) => ({ n, vals: (axisValues[n] ?? "").split(",").map((s) => s.trim()).filter(Boolean) })).filter((a) => a.vals.length);
    if (!axes.length) return;
    let combos: Record<string, string>[] = [{}];
    for (const ax of axes) combos = combos.flatMap((c) => ax.vals.map((v) => ({ ...c, [ax.n]: v })));
    const base = p.variants[0];
    const prefix = (p.slug || slugify(p.name)).toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 16);
    setP((x) => ({
      ...x,
      variants: combos.slice(0, 100).map((o) => {
        const existing = x.variants.find((v) => JSON.stringify(Object.entries(v.options).sort()) === JSON.stringify(Object.entries(o).sort()));
        return existing ?? { ...blankVariant(), price: base?.price ?? "", options: o, title: Object.values(o).join(" / "), sku: `${prefix}-${Object.values(o).map((v) => v.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 4)).join("-")}` };
      }),
    }));
  }

  const save = () =>
    a.run(
      () =>
        saveProductAction({
          ...p,
          colors: p.colors.split(",").map((s) => s.trim()).filter(Boolean),
          tags: p.tags.split(",").map((s) => s.trim()).filter(Boolean),
          publishAt: p.publishAt ? new Date(p.publishAt).toISOString() : null,
          variants: p.variants.map((v) => ({ ...v, title: v.title || Object.values(v.options).join(" / ") || "Default" })),
        }),
      { onOk: (r) => { const d = r.data as { id: string } | undefined; if (!p.id && d?.id) router.replace(shopHref(`/admin/products/${d.id}`)); } },
    );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Product name" error={fe.name} className="sm:col-span-2"><input className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} onBlur={() => !p.slug && set("slug", slugify(p.name))} /></F>
            <F label="URL slug" error={fe.slug} hint={`/products/${p.slug || slugify(p.name) || "…"}`}><input className={inputCls} value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></F>
            <F label="Category">
              <select className={inputCls} value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.depth ? "— " : ""}{c.name}</option>)}
              </select>
            </F>
            <F label="Short description" hint="Shown on cards and at the top of the product page" className="sm:col-span-2" error={fe.shortDescription}><input className={inputCls} maxLength={300} value={p.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></F>
            <F label="Full description" hint="Blank lines start new paragraphs" className="sm:col-span-2"><textarea className={inputCls} rows={7} value={p.description} onChange={(e) => set("description", e.target.value)} /></F>
            <F label="Tags" hint="Comma separated — improves search"><input className={inputCls} value={p.tags} onChange={(e) => set("tags", e.target.value)} /></F>
          </div>
        </Card>

        <Card title="Photos & 3D model" subtitle="First photo is the thumbnail. Drag or use the arrows to reorder. JPG/PNG/WebP/AVIF up to 10 MB.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.images.map((img, i) => (
              <li key={img.url} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIdx != null) moveImage(dragIdx, i); setDragIdx(null); }} className={`rounded-xl border bg-white p-2 ${i === 0 ? "border-accent" : "border-line"}`}>
                <div className="relative aspect-square overflow-hidden rounded-lg bg-paper-2">
                  <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-2 text-[0.65rem] font-bold">Thumbnail</span>}
                  <GripVertical className="absolute right-1.5 top-1.5 h-4 w-4 cursor-grab text-white drop-shadow" aria-hidden="true" />
                </div>
                <input className="input mt-2 py-1.5 text-xs" placeholder="Alt text" value={img.alt} onChange={(e) => setP((x) => ({ ...x, images: x.images.map((m, n) => (n === i ? { ...m, alt: e.target.value } : m)) }))} aria-label="Image alt text" />
                <div className="mt-1 flex justify-between">
                  <span className="flex gap-1">
                    <button type="button" onClick={() => moveImage(i, i - 1)} aria-label="Move left" className="rounded p-1 hover:bg-paper"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
                    <button type="button" onClick={() => moveImage(i, i + 1)} aria-label="Move right" className="rounded p-1 hover:bg-paper"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
                  </span>
                  <button type="button" onClick={() => setP((x) => ({ ...x, images: x.images.filter((_, n) => n !== i) }))} aria-label="Remove photo" className="rounded p-1 text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
            <li>
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm text-muted hover:border-accent">
                {uploading ? <LoaderCircle className="h-6 w-6 animate-spin text-accent" /> : <ImagePlus className="h-6 w-6" />}
                {uploading ? "Uploading…" : "Add photos"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
              </label>
            </li>
          </ul>
          {uploadErr && <p className="field-error">{uploadErr}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3 text-sm">
            <Box className="h-5 w-5 text-accent-ink" />
            {p.modelUrl ? (
              <>
                <a href={p.modelUrl} target="_blank" rel="noopener" className="font-semibold underline">3D model attached</a>
                <button type="button" onClick={() => set("modelUrl", "")} className="text-danger">Remove</button>
              </>
            ) : (
              <span className="text-muted">Optional: STL / OBJ / 3MF (≤ 50 MB) for an interactive 3D view on the product page</span>
            )}
            <label className="ml-auto cursor-pointer font-semibold text-accent-ink">
              {uploading === "model" ? "Uploading…" : p.modelUrl ? "Replace" : "Upload model"}
              <input type="file" accept=".stl,.obj,.3mf" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setUploading("model"); try { set("modelUrl", (await upload(f, "models")).url); } catch (x) { setUploadErr(x instanceof Error ? x.message : "Upload failed"); } setUploading(null); }} />
            </label>
          </div>
        </Card>

        <Card title="Pricing, variants & stock" subtitle="Prices include GST. Every variant has its own SKU, price and stock.">
          <div className="mb-4 rounded-xl bg-paper p-4">
            <F label="Variant options" hint="e.g. Size, Color, Material — leave empty for a single-variant product"><input className={inputCls} value={p.optionNames.join(", ")} onChange={(e) => set("optionNames", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3))} /></F>
            {p.optionNames.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {p.optionNames.map((n) => <F key={n} label={`${n} values`} hint="Comma separated"><input className={inputCls} value={axisValues[n] ?? ""} onChange={(e) => setAxisValues((v) => ({ ...v, [n]: e.target.value }))} /></F>)}
                <div className="flex items-end"><Btn variant="outline" onClick={generateVariants}><Wand2 className="h-4 w-4" /> Generate variants</Btn></div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="text-left text-xs uppercase text-muted">
                <tr>{p.optionNames.map((n) => <th key={n} className="p-1.5">{n}</th>)}<th className="p-1.5">SKU</th><th className="p-1.5">Price ₹</th><th className="p-1.5">Sale ₹</th><th className="p-1.5">Stock</th><th className="p-1.5">Low at</th><th className="p-1.5">Weight g</th><th className="p-1.5">Track</th><th className="p-1.5">Active</th><th /></tr>
              </thead>
              <tbody>
                {p.variants.map((v, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    {p.optionNames.map((n) => <td key={n} className="p-1.5"><input className="input w-28 py-1.5 text-sm" value={v.options[n] ?? ""} onChange={(e) => setVariant(i, { options: { ...v.options, [n]: e.target.value } })} aria-label={n} /></td>)}
                    <td className="p-1.5"><input className="input w-36 py-1.5 font-mono text-xs uppercase" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} aria-label="SKU" aria-invalid={!!fe[`variants.${i}.sku`]} />{fe[`variants.${i}.sku`] && <p className="field-error text-xs">{fe[`variants.${i}.sku`]}</p>}</td>
                    <td className="p-1.5"><input className="input w-24 py-1.5 text-sm" inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} aria-label="Price" /></td>
                    <td className="p-1.5"><input className="input w-24 py-1.5 text-sm" inputMode="decimal" value={v.salePrice} onChange={(e) => setVariant(i, { salePrice: e.target.value })} aria-label="Sale price" />{fe[`variants.${i}.salePrice`] && <p className="field-error text-xs">{fe[`variants.${i}.salePrice`]}</p>}</td>
                    <td className="p-1.5"><input className="input w-20 py-1.5 text-sm" inputMode="numeric" value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} aria-label="Stock" /></td>
                    <td className="p-1.5"><input className="input w-16 py-1.5 text-sm" inputMode="numeric" value={v.lowStockThreshold} onChange={(e) => setVariant(i, { lowStockThreshold: e.target.value })} aria-label="Low-stock threshold" /></td>
                    <td className="p-1.5"><input className="input w-20 py-1.5 text-sm" inputMode="decimal" value={v.weightG} onChange={(e) => setVariant(i, { weightG: e.target.value })} aria-label="Weight" /></td>
                    <td className="p-2.5"><input type="checkbox" className="h-4 w-4" checked={v.trackInventory} onChange={(e) => setVariant(i, { trackInventory: e.target.checked })} aria-label="Track inventory" /></td>
                    <td className="p-2.5"><input type="checkbox" className="h-4 w-4" checked={v.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} aria-label="Active" /></td>
                    <td className="p-1.5"><button type="button" disabled={p.variants.length === 1} onClick={() => setP((x) => ({ ...x, variants: x.variants.filter((_, n) => n !== i) }))} className="rounded p-2 text-muted hover:text-danger disabled:opacity-30" aria-label="Remove variant"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Btn variant="outline" className="mt-3" onClick={() => setP((x) => ({ ...x, variants: [...x.variants, { ...blankVariant(), price: x.variants[0]?.price ?? "" }] }))}><Plus className="h-4 w-4" /> Add variant</Btn>
          {fe.variants && <p className="field-error">{fe.variants}</p>}
        </Card>

        <Card title="3D printing details">
          <div className="grid gap-4 sm:grid-cols-3">
            <F label="Technology"><select className={inputCls} value={p.printTechnology} onChange={(e) => set("printTechnology", e.target.value)}><option value="">—</option><option value="fdm">FDM</option><option value="sla">SLA resin</option><option value="fdm_sla">FDM + SLA</option><option value="other">Other</option></select></F>
            <F label="Material"><input className={inputCls} placeholder="PLA, PETG, Resin…" value={p.material} onChange={(e) => set("material", e.target.value)} /></F>
            <F label="Finish"><input className={inputCls} placeholder="Matte, sanded, painted…" value={p.finish} onChange={(e) => set("finish", e.target.value)} /></F>
            <F label="Colours" hint="Comma separated" className="sm:col-span-3"><input className={inputCls} value={p.colors} onChange={(e) => set("colors", e.target.value)} /></F>
            <F label="Length (mm)"><input className={inputCls} inputMode="decimal" value={p.lengthMm} onChange={(e) => set("lengthMm", e.target.value)} /></F>
            <F label="Width (mm)"><input className={inputCls} inputMode="decimal" value={p.widthMm} onChange={(e) => set("widthMm", e.target.value)} /></F>
            <F label="Height (mm)"><input className={inputCls} inputMode="decimal" value={p.heightMm} onChange={(e) => set("heightMm", e.target.value)} /></F>
            <F label="Weight (g)"><input className={inputCls} inputMode="decimal" value={p.weightG} onChange={(e) => set("weightG", e.target.value)} /></F>
            <F label="Print lead time (days)" hint="Added to delivery estimates"><input className={inputCls} inputMode="numeric" value={p.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} /></F>
          </div>
          <h3 className="mt-6 text-sm font-bold">Specifications</h3>
          <div className="mt-2 space-y-2">
            {p.specifications.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="input w-48 py-2 text-sm" placeholder="Label" value={s.label} onChange={(e) => set("specifications", p.specifications.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} aria-label="Specification label" />
                <input className="input flex-1 py-2 text-sm" placeholder="Value" value={s.value} onChange={(e) => set("specifications", p.specifications.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} aria-label="Specification value" />
                <button type="button" onClick={() => set("specifications", p.specifications.filter((_, n) => n !== i))} className="rounded p-2 text-muted hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Btn variant="outline" onClick={() => set("specifications", [...p.specifications, { label: "", value: "" }])}><Plus className="h-4 w-4" /> Add specification</Btn>
          </div>
        </Card>

        <Card title="Personalisation options" subtitle="Customers fill these in before adding to cart. Surcharges are added to the price on the server.">
          <CustomizationBuilder value={p.customization} onChange={(v) => set("customization", v)} />
          {fe.customization && <p className="field-error">{fe.customization}</p>}
        </Card>

        <Card title="Search engine listing">
          <div className="grid gap-4">
            <F label="SEO title" hint={`${p.seoTitle.length}/70 — defaults to the product name`}><input className={inputCls} maxLength={70} value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></F>
            <F label="Meta description" hint={`${p.seoDescription.length}/170 — defaults to the short description`}><textarea className={inputCls} rows={2} maxLength={170} value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></F>
          </div>
        </Card>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6">
        <Card title="Publishing">
          <F label="Status"><select className={inputCls} value={p.status} onChange={(e) => set("status", e.target.value as EditorProduct["status"])}><option value="draft">Draft (hidden)</option><option value="active">Active (visible)</option><option value="archived">Archived</option></select></F>
          <F label="Publish on" hint="Leave empty to publish immediately when Active" className="mt-4"><input type="datetime-local" suppressHydrationWarning className={inputCls} value={p.publishAt} onChange={(e) => set("publishAt", e.target.value)} /></F>
          <div className="mt-4 space-y-2">
            <Toggle label="Featured on homepage" checked={p.isFeatured} onChange={(v) => set("isFeatured", v)} />
            <Toggle label="Bestseller badge" checked={p.isBestseller} onChange={(v) => set("isBestseller", v)} />
            <Toggle label="New arrival badge" checked={p.isNew} onChange={(v) => set("isNew", v)} />
          </div>
        </Card>
        <Card title="GST">
          <div className="grid grid-cols-2 gap-3">
            <F label="GST rate" error={fe.gstRate}><select className={inputCls} value={p.gstRate} onChange={(e) => set("gstRate", e.target.value)}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</select></F>
            <F label="HSN code" error={fe.hsnCode}><input className={inputCls} inputMode="numeric" value={p.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} /></F>
          </div>
        </Card>
        {collections.length > 0 && (
          <Card title="Collections">
            <div className="space-y-2">{collections.map((c) => <Toggle key={c.id} label={c.name} checked={p.collectionIds.includes(c.id)} onChange={(on) => set("collectionIds", on ? [...p.collectionIds, c.id] : p.collectionIds.filter((x) => x !== c.id))} />)}</div>
          </Card>
        )}
        <div className="card space-y-3 p-5">
          <ResultNote result={a.result} />
          <Btn variant="accent" className="w-full" pending={a.pending || !!uploading} onClick={save}>Save product</Btn>
          {p.id && p.status === "active" && <a href={shopHref(`/products/${p.slug}`)} target="_blank" rel="noopener" className="flex items-center justify-center gap-1 text-sm font-semibold text-accent-ink">View in store <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      </aside>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CustomizationBuilder({ value, onChange }: { value: CustomizationOption[]; onChange: (v: CustomizationOption[]) => void }) {
  const upd = (i: number, patch: Partial<CustomizationOption>) => onChange(value.map((o, n) => (n === i ? ({ ...o, ...patch } as CustomizationOption) : o)));
  const add = (type: CustomizationOption["type"]) => {
    const id = `opt_${value.length + 1}`;
    const o: CustomizationOption = type === "text" ? { id, label: "Name to print", type, required: true, maxLength: 20, priceDelta: 0 } : type === "select" ? { id, label: "Choose an option", type, required: true, choices: [{ label: "Option A", priceDelta: 0 }] } : { id, label: "Gift wrap", type, required: false, priceDelta: 0 };
    onChange([...value, o]);
  };
  return (
    <div className="space-y-3">
      {value.map((o, i) => (
        <div key={i} className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-end gap-3">
            <span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-bold uppercase">{o.type}</span>
            <F label="Label" className="min-w-48 flex-1"><input className={inputCls} value={o.label} onChange={(e) => upd(i, { label: e.target.value })} /></F>
            {o.type !== "checkbox" && <Toggle label="Required" checked={o.required} onChange={(v) => upd(i, { required: v } as Partial<CustomizationOption>)} />}
            {o.type === "text" && <F label="Max characters"><input className="input w-24 py-2 text-sm" inputMode="numeric" value={o.maxLength} onChange={(e) => upd(i, { maxLength: Number(e.target.value) || 1 } as Partial<CustomizationOption>)} /></F>}
            {o.type !== "select" && <F label="Surcharge ₹"><input className="input w-24 py-2 text-sm" inputMode="decimal" value={o.priceDelta} onChange={(e) => upd(i, { priceDelta: Number(e.target.value) || 0 } as Partial<CustomizationOption>)} /></F>}
            <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} className="rounded p-2 text-muted hover:text-danger" aria-label="Remove option"><Trash2 className="h-4 w-4" /></button>
          </div>
          {o.type === "select" && (
            <div className="mt-3 space-y-2">
              {o.choices.map((c, ci) => (
                <div key={ci} className="flex gap-2">
                  <input className="input flex-1 py-1.5 text-sm" value={c.label} onChange={(e) => upd(i, { choices: o.choices.map((x, n) => (n === ci ? { ...x, label: e.target.value } : x)) } as Partial<CustomizationOption>)} aria-label="Choice" />
                  <input className="input w-28 py-1.5 text-sm" inputMode="decimal" value={c.priceDelta} onChange={(e) => upd(i, { choices: o.choices.map((x, n) => (n === ci ? { ...x, priceDelta: Number(e.target.value) || 0 } : x)) } as Partial<CustomizationOption>)} aria-label="Surcharge" />
                  <button type="button" onClick={() => upd(i, { choices: o.choices.filter((_, n) => n !== ci) } as Partial<CustomizationOption>)} className="rounded p-1.5 text-muted hover:text-danger" aria-label="Remove choice"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => upd(i, { choices: [...o.choices, { label: "", priceDelta: 0 }] } as Partial<CustomizationOption>)} className="text-sm font-semibold text-accent-ink">+ Add choice</button>
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" onClick={() => add("text")}><Plus className="h-4 w-4" /> Text (name, message)</Btn>
        <Btn variant="outline" onClick={() => add("select")}><Plus className="h-4 w-4" /> Choice list</Btn>
        <Btn variant="outline" onClick={() => add("checkbox")}><Plus className="h-4 w-4" /> Add-on checkbox</Btn>
      </div>
    </div>
  );
}
