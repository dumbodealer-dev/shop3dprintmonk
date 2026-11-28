import "server-only";
import { cache } from "react";
import { parseCustomizationOptions } from "@/shop/lib/customization";
import type { ProductCardData, ProductDetail, VariantView } from "@/shop/lib/types";
import { db, must, shopConfigured } from "./db";

export const SORTS = {
  relevance: "Relevance",
  popular: "Most popular",
  newest: "New arrivals",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rating: "Top rated",
} as const;
export type SortKey = keyof typeof SORTS;

export type CatalogParams = {
  q?: string;
  categoryIds?: string[];
  collectionId?: string;
  productIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  material?: string;
  technology?: "fdm" | "sla";
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

type CatalogRow = {
  id: string; slug: string; name: string; short_description: string | null; material: string | null; is_new: boolean; is_bestseller: boolean;
  rating_avg: number; rating_count: number; price: number; sale_price: number | null; effective_price: number; max_price: number;
  in_stock: boolean; variant_count: number; image_url: string | null; image_alt: string | null; hover_image_url: string | null;
  is_customizable: boolean; total_count: number; created_at: string;
};

const toCard = (r: CatalogRow): ProductCardData => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  shortDescription: r.short_description,
  material: r.material,
  price: Number(r.price),
  salePrice: r.sale_price == null ? null : Number(r.sale_price),
  maxPrice: Number(r.max_price),
  inStock: r.in_stock,
  variantCount: r.variant_count,
  imageUrl: r.image_url,
  imageAlt: r.image_alt,
  hoverImageUrl: r.hover_image_url,
  ratingAvg: Number(r.rating_avg),
  ratingCount: r.rating_count,
  isNew: r.is_new,
  isBestseller: r.is_bestseller,
  isCustomizable: r.is_customizable,
});

export async function listProducts(p: CatalogParams = {}) {
  const perPage = Math.min(Math.max(p.perPage ?? 24, 1), 60);
  const page = Math.max(1, Math.floor(p.page ?? 1));
  if (!shopConfigured()) return { items: [] as ProductCardData[], total: 0, page, pages: 0, perPage };
  const sort: SortKey = p.sort && p.sort in SORTS ? p.sort : p.q ? "relevance" : "popular";
  const res = await db().rpc("shop_catalog", {
    p_query: p.q?.slice(0, 100) || null,
    p_category_ids: p.categoryIds?.length ? p.categoryIds : null,
    p_collection_id: p.collectionId ?? null,
    p_min_price: p.minPrice ?? null,
    p_max_price: p.maxPrice ?? null,
    p_in_stock: !!p.inStock,
    p_on_sale: !!p.onSale,
    p_material: p.material || null,
    p_technology: p.technology ?? null,
    p_sort: sort === "relevance" && !p.q ? "popular" : sort,
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
    p_product_ids: p.productIds?.length ? p.productIds : null,
  });
  const rows = (must(res, "catalog") ?? []) as CatalogRow[];
  const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0;
  return { items: rows.map(toCard), total, page, pages: Math.ceil(total / perPage), perPage };
}

export type Category = { id: string; slug: string; name: string; description: string | null; imageUrl: string | null; parentId: string | null; sortOrder: number; children: Category[] };

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!shopConfigured()) return [];
  const rows = must(
    await db().from("shop_categories").select("id, slug, name, description, image_url, parent_id, sort_order").eq("is_active", true).order("sort_order"),
    "categories",
  ) as { id: string; slug: string; name: string; description: string | null; image_url: string | null; parent_id: string | null; sort_order: number }[];
  const all: Category[] = rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, description: r.description, imageUrl: r.image_url, parentId: r.parent_id, sortOrder: r.sort_order, children: [] }));
  const byId = new Map(all.map((c) => [c.id, c]));
  for (const c of all) if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.children.push(c);
  return all.filter((c) => !c.parentId || !byId.has(c.parentId));
});

export async function getCategoryBySlug(slug: string) {
  const tree = await getCategories();
  for (const c of tree) {
    if (c.slug === slug) return { category: c, parent: null };
    const child = c.children.find((k) => k.slug === slug);
    if (child) return { category: child, parent: c };
  }
  return null;
}

/** A category plus its sub-categories (for filtering). */
export const categoryScope = (c: Category) => [c.id, ...c.children.map((k) => k.id)];

export const getMaterials = cache(async (): Promise<string[]> => {
  if (!shopConfigured()) return [];
  const { data } = await db().from("shop_products").select("material").eq("status", "active").not("material", "is", null);
  return [...new Set((data ?? []).map((r) => r.material as string))].sort();
});

type VariantRow = { id: string; sku: string; title: string; options: Record<string, string>; price: number; sale_price: number | null; stock: number; track_inventory: boolean; low_stock_threshold: number; is_active: boolean; sort_order: number };

export function toVariantView(v: VariantRow): VariantView {
  const available = !v.track_inventory || v.stock > 0;
  return {
    id: v.id,
    sku: v.sku,
    title: v.title,
    options: v.options ?? {},
    price: Number(v.price),
    salePrice: v.sale_price != null && Number(v.sale_price) < Number(v.price) ? Number(v.sale_price) : null,
    stock: v.track_inventory ? v.stock : 999,
    trackInventory: v.track_inventory,
    available,
    lowStock: v.track_inventory && v.stock > 0 && v.stock <= v.low_stock_threshold,
  };
}

const PRODUCT_SELECT = `id, slug, name, short_description, description, status, publish_at, print_technology, material, finish, colors,
  length_mm, width_mm, height_mm, weight_g, hsn_code, gst_rate, specifications, customization, lead_time_days,
  is_featured, is_bestseller, is_new, tags, model_url, seo_title, seo_description, rating_avg, rating_count, updated_at,
  category:shop_categories (id, slug, name, parent:shop_categories (slug, name)),
  images:shop_product_images (id, url, alt, width, height, sort_order),
  variants:shop_variants (id, sku, title, options, price, sale_price, stock, track_inventory, low_stock_threshold, is_active, sort_order)`;

/** Published product by slug (null if missing, draft, archived or scheduled for later). */
export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  if (!shopConfigured() || !/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  const { data, error } = await db().from("shop_products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
  if (error) console.error("[shop] product load failed:", error.message);
  if (!data) return null;
  const p = data as unknown as Record<string, unknown> & { status: string; publish_at: string | null };
  if (p.status !== "active" || (p.publish_at && new Date(p.publish_at) > new Date())) return null;
  return toProductDetail(p);
});

export function toProductDetail(p: Record<string, unknown>): ProductDetail {
  const variants = ((p.variants as VariantRow[]) ?? []).filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order).map(toVariantView);
  const axesMap = new Map<string, string[]>();
  for (const v of variants) for (const [k, val] of Object.entries(v.options)) {
    const list = axesMap.get(k) ?? [];
    if (!list.includes(val)) list.push(val);
    axesMap.set(k, list);
  }
  const cat = p.category as { id: string; slug: string; name: string; parent: { slug: string; name: string } | null } | null;
  return {
    id: p.id as string,
    slug: p.slug as string,
    name: p.name as string,
    shortDescription: (p.short_description as string) ?? null,
    description: (p.description as string) ?? null,
    category: cat ? { id: cat.id, slug: cat.slug, name: cat.name, parent: cat.parent ?? null } : null,
    printTechnology: (p.print_technology as string) ?? null,
    material: (p.material as string) ?? null,
    finish: (p.finish as string) ?? null,
    colors: (p.colors as string[]) ?? [],
    dimensionsMm: { length: num(p.length_mm), width: num(p.width_mm), height: num(p.height_mm) },
    weightG: num(p.weight_g),
    gstRate: Number(p.gst_rate ?? 18),
    hsnCode: (p.hsn_code as string) ?? null,
    specifications: Array.isArray(p.specifications) ? (p.specifications as { label: string; value: string }[]).filter((s) => s?.label && s?.value) : [],
    customization: parseCustomizationOptions(p.customization),
    leadTimeDays: Number(p.lead_time_days ?? 0),
    isFeatured: !!p.is_featured,
    isBestseller: !!p.is_bestseller,
    isNew: !!p.is_new,
    tags: (p.tags as string[]) ?? [],
    modelUrl: (p.model_url as string) ?? null,
    seoTitle: (p.seo_title as string) ?? null,
    seoDescription: (p.seo_description as string) ?? null,
    ratingAvg: Number(p.rating_avg ?? 0),
    ratingCount: Number(p.rating_count ?? 0),
    images: ((p.images as { id: string; url: string; alt: string | null; width: number | null; height: number | null; sort_order: number }[]) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt, width: i.width, height: i.height })),
    variants,
    axes: [...axesMap.entries()].map(([name, values]) => ({ name, values })),
    updatedAt: p.updated_at as string,
  };
}
const num = (v: unknown) => (v == null ? null : Number(v));

export async function getRelatedProducts(product: ProductDetail, limit = 8) {
  const ids = product.category ? [product.category.id] : undefined;
  const { items } = await listProducts({ categoryIds: ids, perPage: limit + 1, sort: "popular" });
  const related = items.filter((i) => i.id !== product.id);
  if (related.length < 4) {
    const more = await listProducts({ perPage: limit + 1, sort: "popular" });
    for (const m of more.items) if (m.id !== product.id && !related.some((r) => r.id === m.id)) related.push(m);
  }
  return related.slice(0, limit);
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { items } = await listProducts({ productIds: ids.slice(0, 60), perPage: 60, sort: "newest" });
  const order = new Map(ids.map((id, i) => [id, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Scheduled content: visible between starts_at and ends_at (either may be empty). */
const live = (r: { starts_at: string | null; ends_at: string | null }, now: string) => {
  const t = Date.parse(now);
  return (!r.starts_at || Date.parse(r.starts_at) <= t) && (!r.ends_at || Date.parse(r.ends_at) > t);
};

export type Banner = { id: string; placement: string; title: string; subtitle: string | null; ctaLabel: string | null; ctaUrl: string | null; imageUrl: string | null; theme: "dark" | "light" | "accent" };

export const getBanners = cache(async (): Promise<Banner[]> => {
  if (!shopConfigured()) return [];
  const now = new Date().toISOString();
  const { data } = await db()
    .from("shop_banners")
    .select("id, placement, title, subtitle, cta_label, cta_url, image_url, theme, starts_at, ends_at")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).filter((b) => live(b, now)).map((b) => ({ id: b.id, placement: b.placement, title: b.title, subtitle: b.subtitle, ctaLabel: b.cta_label, ctaUrl: b.cta_url, imageUrl: b.image_url, theme: b.theme }));
});

export type Collection = { id: string; slug: string; name: string; description: string | null; imageUrl: string | null; isSeasonal: boolean };

export const getCollections = cache(async (featuredOnly = false): Promise<Collection[]> => {
  if (!shopConfigured()) return [];
  const now = new Date().toISOString();
  let q = db()
    .from("shop_collections")
    .select("id, slug, name, description, image_url, is_seasonal, is_featured, starts_at, ends_at")
    .eq("is_active", true)
    .order("sort_order");
  if (featuredOnly) q = q.eq("is_featured", true);
  const { data } = await q;
  return (data ?? []).filter((c) => live(c, now)).map((c) => ({ id: c.id, slug: c.slug, name: c.name, description: c.description, imageUrl: c.image_url, isSeasonal: c.is_seasonal }));
});

export async function getCollectionBySlug(slug: string) {
  return (await getCollections()).find((c) => c.slug === slug) ?? null;
}

export async function searchSuggestions(q: string) {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { products: [], categories: [] };
  const [{ items }, tree] = await Promise.all([listProducts({ q: query, perPage: 6, sort: "relevance" }), getCategories()]);
  const flat = tree.flatMap((c) => [c, ...c.children]);
  const lower = query.toLowerCase();
  return {
    products: items.map((i) => ({ slug: i.slug, name: i.name, price: i.salePrice ?? i.price, imageUrl: i.imageUrl })),
    categories: flat.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 3).map((c) => ({ slug: c.slug, name: c.name })),
  };
}

export type Review = { id: string; authorName: string; rating: number; title: string | null; body: string | null; verified: boolean; createdAt: string };

export async function getReviews(productId: string, limit = 20): Promise<{ reviews: Review[]; distribution: number[] }> {
  if (!shopConfigured()) return { reviews: [], distribution: [0, 0, 0, 0, 0] };
  const { data } = await db()
    .from("shop_reviews")
    .select("id, author_name, rating, title, body, verified_purchase, created_at")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);
  const all = data ?? [];
  const distribution = [5, 4, 3, 2, 1].map((n) => all.filter((r) => r.rating === n).length);
  return {
    reviews: all.slice(0, limit).map((r) => ({ id: r.id, authorName: r.author_name, rating: r.rating, title: r.title, body: r.body, verified: r.verified_purchase, createdAt: r.created_at })),
    distribution,
  };
}
