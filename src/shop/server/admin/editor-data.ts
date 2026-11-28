import "server-only";
import type { EditorProduct } from "@/shop/components/admin/ProductEditor";
import { parseCustomizationOptions } from "@/shop/lib/customization";
import { db } from "../db";

/** Data the product editor needs: categories (flattened tree) and collections. */
export async function editorLookups() {
  const [{ data: cats }, { data: cols }] = await Promise.all([
    db().from("shop_categories").select("id, name, parent_id, sort_order").order("sort_order"),
    db().from("shop_collections").select("id, name").order("sort_order"),
  ]);
  const roots = (cats ?? []).filter((c) => !c.parent_id);
  const categories = roots.flatMap((r) => [{ id: r.id, name: r.name, depth: 0 }, ...(cats ?? []).filter((c) => c.parent_id === r.id).map((c) => ({ id: c.id, name: c.name, depth: 1 }))]);
  return { categories, collections: cols ?? [] };
}

const s = (v: unknown) => (v == null ? "" : String(v));

export async function loadEditorProduct(id: string): Promise<EditorProduct | null> {
  const { data } = await db()
    .from("shop_products")
    .select("*, images:shop_product_images (id, url, storage_path, alt, sort_order), variants:shop_variants (*), collections:shop_collection_products (collection_id)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const variants = (data.variants as Record<string, unknown>[]).sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const optionNames = [...new Set(variants.flatMap((v) => Object.keys((v.options as object) ?? {})))].slice(0, 3);
  return {
    id: data.id, name: data.name, slug: data.slug, shortDescription: s(data.short_description), description: s(data.description), categoryId: s(data.category_id), status: data.status,
    publishAt: s(data.publish_at), printTechnology: s(data.print_technology), material: s(data.material), finish: s(data.finish), colors: (data.colors ?? []).join(", "),
    lengthMm: s(data.length_mm), widthMm: s(data.width_mm), heightMm: s(data.height_mm), weightG: s(data.weight_g), hsnCode: s(data.hsn_code), gstRate: s(data.gst_rate),
    specifications: Array.isArray(data.specifications) ? data.specifications : [], customization: parseCustomizationOptions(data.customization), leadTimeDays: s(data.lead_time_days),
    isFeatured: data.is_featured, isBestseller: data.is_bestseller, isNew: data.is_new, tags: (data.tags ?? []).join(", "), modelUrl: s(data.model_url), seoTitle: s(data.seo_title), seoDescription: s(data.seo_description),
    images: (data.images as { id: string; url: string; storage_path: string | null; alt: string | null; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order).map((i) => ({ id: i.id, url: i.url, storagePath: i.storage_path, alt: i.alt ?? "" })),
    variants: variants.map((v) => ({ id: v.id as string, sku: s(v.sku), title: s(v.title), options: (v.options as Record<string, string>) ?? {}, price: s(v.price), salePrice: s(v.sale_price), stock: s(v.stock), trackInventory: !!v.track_inventory, lowStockThreshold: s(v.low_stock_threshold), weightG: s(v.weight_g), isActive: !!v.is_active })),
    collectionIds: (data.collections as { collection_id: string }[]).map((c) => c.collection_id),
    optionNames,
  };
}
