import type { MetadataRoute } from "next";
import { shopUrl } from "@/shop/config";
import { POLICY_PAGES } from "@/shop/lib/settings-schema";
import { db, shopConfigured } from "@/shop/server/db";

export const revalidate = 3600;

/** /shop/sitemap.xml (or /sitemap.xml on the shop subdomain). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: shopUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: shopUrl("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...Object.keys(POLICY_PAGES).map((p) => ({ url: shopUrl(`/policies/${p}`), changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
  if (!shopConfigured()) return out;
  const [{ data: products }, { data: cats }, { data: cols }] = await Promise.all([
    db().from("shop_products").select("slug, updated_at, publish_at").eq("status", "active").limit(5000),
    db().from("shop_categories").select("slug").eq("is_active", true),
    db().from("shop_collections").select("slug").eq("is_active", true),
  ]);
  for (const p of products ?? []) if (!p.publish_at || new Date(p.publish_at) <= now) out.push({ url: shopUrl(`/products/${p.slug}`), lastModified: new Date(p.updated_at), changeFrequency: "weekly", priority: 0.8 });
  for (const c of cats ?? []) out.push({ url: shopUrl(`/category/${c.slug}`), changeFrequency: "weekly", priority: 0.7 });
  for (const c of cols ?? []) out.push({ url: shopUrl(`/collections/${c.slug}`), changeFrequency: "weekly", priority: 0.6 });
  return out;
}
