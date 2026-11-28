import type { Metadata } from "next";
import { CatalogView, type SearchParams } from "@/shop/components/CatalogView";
import { shopHref } from "@/shop/config";
import { shopMetadata } from "@/shop/seo";
import { getCategories } from "@/shop/server/catalog";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const base = shopMetadata({ title: "All products", description: "Browse every 3D printed product: planters, lamps, desk accessories, toys, miniatures and personalised gifts.", path: "/products" });
  // Search and filtered views are not indexed (the canonical points at the main listing).
  return Object.keys(sp).some((k) => k !== "page") ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tree = await getCategories();
  return (
    <CatalogView
      title="All products"
      description="Designed, printed and finished in our Delhi print farm."
      crumbs={[{ name: "Shop", path: "/" }, { name: "All products", path: "/products" }]}
      path="/products"
      searchParams={sp}
      categoriesNav={tree.map((c) => ({ slug: c.slug, name: c.name, href: shopHref(`/category/${c.slug}`), active: false }))}
    />
  );
}
