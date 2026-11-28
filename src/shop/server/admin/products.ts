import "server-only";
import { z } from "zod";
import { slugify } from "@/shop/lib/slug";
import { csvObjects, toCsv } from "@/shop/lib/csv";
import { db, must, ShopError } from "../db";

/** Validation for the admin product editor. Prices, stock and SKUs are checked here on the server. */
const money = z.coerce.number().min(0).max(10_000_000);
const optMoney = z.union([z.literal(""), z.null(), z.coerce.number().min(0).max(10_000_000)]).transform((v) => (v === "" || v == null ? null : Number(v)));
const optNum = z.union([z.literal(""), z.null(), z.coerce.number().min(0).max(1_000_000)]).transform((v) => (v === "" || v == null ? null : Number(v)));
const text = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));

const customizationSchema = z.array(
  z.discriminatedUnion("type", [
    z.object({ id: z.string().regex(/^[a-z0-9_]{1,30}$/), label: z.string().trim().min(1).max(80), type: z.literal("text"), required: z.boolean(), maxLength: z.coerce.number().int().min(1).max(500), placeholder: z.string().max(80).optional(), priceDelta: z.coerce.number().min(0).max(100000), help: z.string().max(200).optional() }),
    z.object({ id: z.string().regex(/^[a-z0-9_]{1,30}$/), label: z.string().trim().min(1).max(80), type: z.literal("select"), required: z.boolean(), choices: z.array(z.object({ label: z.string().trim().min(1).max(60), priceDelta: z.coerce.number().min(0).max(100000) })).min(1).max(30), help: z.string().max(200).optional() }),
    z.object({ id: z.string().regex(/^[a-z0-9_]{1,30}$/), label: z.string().trim().min(1).max(80), type: z.literal("checkbox"), required: z.literal(false).default(false), priceDelta: z.coerce.number().min(0).max(100000), help: z.string().max(200).optional() }),
  ]),
).max(10);

export const productInputSchema = z
  .object({
    id: z.uuid().optional().nullable(),
    name: z.string().trim().min(2, "Enter a product name").max(160),
    slug: z.string().trim().max(100).optional().default(""),
    shortDescription: text(300),
    description: text(10000),
    categoryId: z.uuid().nullable().optional().or(z.literal("")).transform((v) => v || null),
    status: z.enum(["draft", "active", "archived"]),
    publishAt: z.string().nullable().optional().transform((v) => (v ? new Date(v).toISOString() : null)),
    printTechnology: z.enum(["fdm", "sla", "fdm_sla", "other"]).nullable().optional().or(z.literal("")).transform((v) => v || null),
    material: text(80),
    finish: text(120),
    colors: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    lengthMm: optNum,
    widthMm: optNum,
    heightMm: optNum,
    weightG: optNum,
    hsnCode: z.string().trim().regex(/^(\d{4}|\d{6}|\d{8})?$/, "HSN code must be 4, 6 or 8 digits").nullable().optional().transform((v) => v || null),
    gstRate: z.coerce.number().refine((r) => [0, 5, 12, 18, 28].includes(r), "GST rate must be 0, 5, 12, 18 or 28%"),
    specifications: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(40).default([]),
    customization: customizationSchema.default([]),
    leadTimeDays: z.coerce.number().int().min(0).max(60).default(0),
    isFeatured: z.boolean().default(false),
    isBestseller: z.boolean().default(false),
    isNew: z.boolean().default(false),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    modelUrl: z.url().nullable().optional().or(z.literal("")).transform((v) => v || null),
    seoTitle: text(70),
    seoDescription: text(170),
    images: z.array(z.object({ id: z.uuid().optional().nullable(), url: z.url(), storagePath: z.string().max(300).nullable().optional(), alt: text(200), width: z.number().int().positive().nullable().optional(), height: z.number().int().positive().nullable().optional() })).max(20).default([]),
    variants: z
      .array(
        z.object({
          id: z.uuid().optional().nullable(),
          sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{1,39}$/, "SKU: 2–40 letters, numbers, - or _"),
          title: z.string().trim().min(1).max(120).default("Default"),
          options: z.record(z.string().trim().min(1).max(30), z.string().trim().min(1).max(60)).default({}),
          price: money,
          salePrice: optMoney,
          stock: z.coerce.number().int().min(0).max(1_000_000),
          trackInventory: z.boolean().default(true),
          lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
          weightG: optNum,
          isActive: z.boolean().default(true),
        }),
      )
      .min(1, "Add at least one variant (price & stock)")
      .max(100),
    collectionIds: z.array(z.uuid()).max(50).default([]),
  })
  .superRefine((p, ctx) => {
    const skus = new Set<string>();
    p.variants.forEach((v, i) => {
      if (skus.has(v.sku)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
      skus.add(v.sku);
      if (v.salePrice != null && v.salePrice >= v.price) ctx.addIssue({ code: "custom", path: ["variants", i, "salePrice"], message: "Sale price must be lower than the price" });
    });
    if (p.variants.length > 1) {
      const keys = new Set<string>();
      p.variants.forEach((v, i) => {
        const k = JSON.stringify(Object.entries(v.options).sort());
        if (keys.has(k)) ctx.addIssue({ code: "custom", path: ["variants", i, "options"], message: "Two variants have the same options" });
        keys.add(k);
      });
    }
  });
export type ProductInput = z.input<typeof productInputSchema>;

export async function saveProduct(raw: unknown, adminId: string) {
  const p = productInputSchema.parse(raw);
  const slug = slugify(p.slug || p.name);
  if (!slug) throw new ShopError("Enter a valid URL slug.", 422, "slug", { slug: "Invalid slug" });

  const row = {
    slug, name: p.name, short_description: p.shortDescription, description: p.description, category_id: p.categoryId, status: p.status, publish_at: p.publishAt,
    print_technology: p.printTechnology, material: p.material, finish: p.finish, colors: p.colors, length_mm: p.lengthMm, width_mm: p.widthMm, height_mm: p.heightMm,
    weight_g: p.weightG, hsn_code: p.hsnCode, gst_rate: p.gstRate, specifications: p.specifications, customization: p.customization, lead_time_days: p.leadTimeDays,
    is_featured: p.isFeatured, is_bestseller: p.isBestseller, is_new: p.isNew, tags: p.tags, model_url: p.modelUrl, seo_title: p.seoTitle, seo_description: p.seoDescription,
  };
  const saved = p.id
    ? await db().from("shop_products").update(row).eq("id", p.id).select("id").single()
    : await db().from("shop_products").insert(row).select("id").single();
  if (saved.error?.code === "23505") throw new ShopError("Another product already uses this URL slug.", 409, "slug", { slug: "Already in use" });
  const productId = must(saved, "save product").id as string;

  // ── Images (order = array order; first image is the thumbnail) ─────────
  const { data: oldImages } = await db().from("shop_product_images").select("id, storage_path").eq("product_id", productId);
  const keep = new Set(p.images.map((i) => i.id).filter(Boolean));
  const removed = (oldImages ?? []).filter((i) => !keep.has(i.id));
  if (removed.length) {
    await db().from("shop_product_images").delete().in("id", removed.map((i) => i.id));
    const paths = removed.map((i) => i.storage_path).filter(Boolean) as string[];
    if (paths.length) await db().storage.from("shop-media").remove(paths);
  }
  for (const [n, img] of p.images.entries()) {
    const r = { product_id: productId, url: img.url, storage_path: img.storagePath ?? null, alt: img.alt ?? p.name, width: img.width ?? null, height: img.height ?? null, sort_order: n };
    if (img.id) must(await db().from("shop_product_images").update(r).eq("id", img.id).eq("product_id", productId), "image");
    else must(await db().from("shop_product_images").insert(r), "image");
  }

  // ── Variants (stock changes are recorded as inventory adjustments) ─────
  const { data: oldVariants } = await db().from("shop_variants").select("id, stock").eq("product_id", productId);
  const oldById = new Map((oldVariants ?? []).map((v) => [v.id, v]));
  const keepV = new Set(p.variants.map((v) => v.id).filter(Boolean));
  for (const old of oldVariants ?? []) if (!keepV.has(old.id)) await db().from("shop_variants").delete().eq("id", old.id);
  for (const [n, v] of p.variants.entries()) {
    const r = { product_id: productId, sku: v.sku, title: v.title, options: v.options, price: v.price, sale_price: v.salePrice, track_inventory: v.trackInventory, low_stock_threshold: v.lowStockThreshold, weight_g: v.weightG, is_active: v.isActive, sort_order: n };
    if (v.id && oldById.has(v.id)) {
      const res = await db().from("shop_variants").update(r).eq("id", v.id);
      if (res.error?.code === "23505") throw new ShopError(`SKU ${v.sku} is already used by another product.`, 409, "sku");
      must(res, "variant");
      const delta = v.stock - oldById.get(v.id)!.stock;
      if (delta !== 0) must(await db().rpc("shop_adjust_stock", { p_variant_id: v.id, p_delta: delta, p_reason: "adjustment", p_note: "Edited in product editor", p_admin_id: adminId }), "stock");
    } else {
      const res = await db().from("shop_variants").insert({ ...r, stock: v.stock }).select("id").single();
      if (res.error?.code === "23505") throw new ShopError(`SKU ${v.sku} is already used by another product.`, 409, "sku");
      const vid = must(res, "variant").id;
      if (v.stock) await db().from("shop_inventory_movements").insert({ variant_id: vid, delta: v.stock, stock_after: v.stock, reason: "initial", admin_id: adminId });
    }
  }

  // ── Collections ────────────────────────────────────────────────────────
  await db().from("shop_collection_products").delete().eq("product_id", productId);
  if (p.collectionIds.length) await db().from("shop_collection_products").insert(p.collectionIds.map((c) => ({ collection_id: c, product_id: productId })));

  return { id: productId, slug };
}

/** Products with order history are archived (kept for invoices); others are deleted with their photos. */
export async function deleteOrArchiveProduct(id: string) {
  const { count } = await db().from("shop_order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if ((count ?? 0) > 0) {
    must(await db().from("shop_products").update({ status: "archived" }).eq("id", id), "archive");
    return "archived" as const;
  }
  const { data: imgs } = await db().from("shop_product_images").select("storage_path").eq("product_id", id);
  must(await db().from("shop_products").delete().eq("id", id), "delete");
  const paths = (imgs ?? []).map((i) => i.storage_path).filter(Boolean) as string[];
  if (paths.length) await db().storage.from("shop-media").remove(paths);
  return "deleted" as const;
}

// ── CSV import / export (one row per variant) ─────────────────────────────
export const PRODUCT_CSV_COLUMNS = [
  "slug", "name", "status", "category_slug", "short_description", "description", "print_technology", "material", "finish", "gst_rate", "hsn_code",
  "lead_time_days", "is_featured", "is_bestseller", "is_new", "tags", "sku", "variant_title", "option1_name", "option1_value", "option2_name", "option2_value",
  "price", "sale_price", "stock", "weight_g", "image_urls",
] as const;

export async function exportProductsCsv() {
  const { data } = await db()
    .from("shop_products")
    .select("slug, name, status, short_description, description, print_technology, material, finish, gst_rate, hsn_code, lead_time_days, is_featured, is_bestseller, is_new, tags, category:shop_categories (slug), images:shop_product_images (url, sort_order), variants:shop_variants (sku, title, options, price, sale_price, stock, weight_g, sort_order)")
    .order("created_at");
  const rows: (string | number | boolean | null)[][] = [[...PRODUCT_CSV_COLUMNS]];
  for (const p of (data ?? []) as unknown as Record<string, unknown>[]) {
    const images = ((p.images as { url: string; sort_order: number }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url).join(" ");
    for (const v of ((p.variants as { sku: string; title: string; options: Record<string, string>; price: number; sale_price: number | null; stock: number; weight_g: number | null; sort_order: number }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
      const opts = Object.entries(v.options ?? {});
      rows.push([
        p.slug as string, p.name as string, p.status as string, (p.category as { slug: string } | null)?.slug ?? "", (p.short_description as string) ?? "", (p.description as string) ?? "",
        (p.print_technology as string) ?? "", (p.material as string) ?? "", (p.finish as string) ?? "", p.gst_rate as number, (p.hsn_code as string) ?? "", p.lead_time_days as number,
        p.is_featured as boolean, p.is_bestseller as boolean, p.is_new as boolean, ((p.tags as string[]) ?? []).join("|"),
        v.sku, v.title, opts[0]?.[0] ?? "", opts[0]?.[1] ?? "", opts[1]?.[0] ?? "", opts[1]?.[1] ?? "", v.price, v.sale_price ?? "", v.stock, v.weight_g ?? "", images,
      ]);
    }
  }
  return toCsv(rows);
}

/** Upserts products by slug and variants by SKU. Stock differences are logged as "import" movements. */
export async function importProductsCsv(csv: string, adminId: string) {
  const rows = csvObjects(csv);
  if (!rows.length) throw new ShopError("The file has no rows.", 422);
  if (rows.length > 5000) throw new ShopError("Import at most 5,000 rows at a time.", 422);
  const missing = ["slug", "name", "sku", "price"].filter((c) => !(c in rows[0]));
  if (missing.length) throw new ShopError(`Missing column(s): ${missing.join(", ")}`, 422);

  const { data: cats } = await db().from("shop_categories").select("id, slug");
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const bool = (v: string | undefined) => /^(1|true|yes|y)$/i.test(v ?? "");
  const errors: string[] = [];
  let products = 0;
  let variants = 0;
  const productIds = new Map<string, string>();

  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    try {
      const slug = slugify(r.slug || r.name);
      let pid = productIds.get(slug);
      if (!pid) {
        const prow = {
          slug, name: r.name, status: ["draft", "active", "archived"].includes(r.status) ? r.status : "draft",
          category_id: r.category_slug ? (catBySlug.get(r.category_slug) ?? null) : null, short_description: r.short_description || null, description: r.description || null,
          print_technology: ["fdm", "sla", "fdm_sla", "other"].includes(r.print_technology) ? r.print_technology : null, material: r.material || null, finish: r.finish || null,
          gst_rate: [0, 5, 12, 18, 28].includes(Number(r.gst_rate)) ? Number(r.gst_rate) : 18, hsn_code: /^\d{4,8}$/.test(r.hsn_code ?? "") ? r.hsn_code : null,
          lead_time_days: Math.max(0, Math.min(60, Number(r.lead_time_days) || 0)), is_featured: bool(r.is_featured), is_bestseller: bool(r.is_bestseller), is_new: bool(r.is_new),
          tags: (r.tags ?? "").split("|").map((t) => t.trim()).filter(Boolean),
        };
        const res = must(await db().from("shop_products").upsert(prow, { onConflict: "slug" }).select("id").single(), `product row ${line}`);
        pid = (res as unknown as { id: string }).id;
        productIds.set(slug, pid);
        products++;
        const urls = (r.image_urls ?? "").split(/\s+/).filter((u) => /^https:\/\//.test(u)).slice(0, 20);
        if (urls.length) {
          await db().from("shop_product_images").delete().eq("product_id", pid);
          await db().from("shop_product_images").insert(urls.map((url, n) => ({ product_id: pid, url, alt: r.name, sort_order: n })));
        }
      }
      const sku = r.sku.trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(sku)) throw new Error("invalid SKU");
      const price = Number(r.price);
      if (!Number.isFinite(price) || price < 0) throw new Error("invalid price");
      const sale = r.sale_price ? Number(r.sale_price) : null;
      const options: Record<string, string> = {};
      if (r.option1_name && r.option1_value) options[r.option1_name] = r.option1_value;
      if (r.option2_name && r.option2_value) options[r.option2_name] = r.option2_value;
      const stock = Math.max(0, Math.floor(Number(r.stock) || 0));
      const { data: existing } = await db().from("shop_variants").select("id, stock, product_id").eq("sku", sku).maybeSingle();
      const vrow = { product_id: pid, sku, title: r.variant_title || Object.values(options).join(" / ") || "Default", options, price, sale_price: sale != null && sale < price ? sale : null, weight_g: r.weight_g ? Number(r.weight_g) : null };
      if (existing) {
        must(await db().from("shop_variants").update(vrow).eq("id", existing.id), `variant row ${line}`);
        if (r.stock !== undefined && r.stock !== "" && stock !== existing.stock) await db().rpc("shop_adjust_stock", { p_variant_id: existing.id, p_delta: stock - existing.stock, p_reason: "import", p_note: "CSV import", p_admin_id: adminId });
      } else {
        const ins = must(await db().from("shop_variants").insert({ ...vrow, stock }).select("id").single(), `variant row ${line}`);
        if (stock) await db().from("shop_inventory_movements").insert({ variant_id: (ins as unknown as { id: string }).id, delta: stock, stock_after: stock, reason: "import", admin_id: adminId, note: "CSV import" });
      }
      variants++;
    } catch (e) {
      errors.push(`Row ${line}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  return { products, variants, errors: errors.slice(0, 50) };
}
