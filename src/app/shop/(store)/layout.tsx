import type { Metadata } from "next";
import { CartDrawer } from "@/shop/components/CartDrawer";
import { ShopFooter } from "@/shop/components/ShopFooter";
import { ShopHeader, type NavCategory } from "@/shop/components/ShopHeader";
import { ShopProvider } from "@/shop/components/ShopProvider";
import { JsonLd } from "@/components/ui/JsonLd";
import { SHOP_URL, shopUrl } from "@/shop/config";
import { getBanners, getCategories } from "@/shop/server/catalog";
import { getSettings } from "@/shop/server/settings";
import { Notice } from "@/shop/components/ui";
import { shopConfigured } from "@/shop/server/db";

export const metadata: Metadata = {
  title: { default: "3D PRINTMONK Shop — 3D printed products made in India", template: "%s | 3D PRINTMONK Shop" },
  description: "Shop 3D printed planters, lamps, desk organisers, toys, miniatures and personalised gifts — printed to order in Delhi and delivered across India.",
  alternates: { canonical: SHOP_URL },
};

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [tree, settings, banners] = await Promise.all([getCategories(), getSettings(), getBanners()]);
  const categories: NavCategory[] = tree.map((c) => ({ slug: c.slug, name: c.name, children: c.children.map((k) => ({ slug: k.slug, name: k.name })) }));
  const strip = banners.find((b) => b.placement === "strip")?.title ?? null;
  return (
    <ShopProvider>
      <ShopHeader categories={categories} strip={strip} />
      {!shopConfigured() && (
        <div className="container-x pt-4">
          <Notice tone="warning">
            <strong>Shop setup required:</strong> connect Supabase and run <code>supabase/shop-schema.sql</code> to load products. See README → Shop.
          </Notice>
        </div>
      )}
      <main id="main" className="min-h-[60vh]">{children}</main>
      <ShopFooter settings={settings} categories={categories} />
      <CartDrawer />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings.store.name,
          url: SHOP_URL,
          potentialAction: { "@type": "SearchAction", target: `${shopUrl("/products")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
    </ShopProvider>
  );
}
