import { PageTitle } from "@/shop/components/admin/kit";
import { BannerManager, CollectionManager, HOMEPAGE_FIELDS, SettingsSectionForm, type BannerRow, type CollectionRow } from "@/shop/components/admin/ContentSettings";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";
import { getSettings } from "@/shop/server/settings";

export const metadata = { title: "Homepage & content" };

export default async function ContentAdmin() {
  await requireAdminPage("content");
  const [{ data: banners }, { data: cols }, { data: products }, settings] = await Promise.all([
    db().from("shop_banners").select("*").order("placement").order("sort_order"),
    db().from("shop_collections").select("*, items:shop_collection_products (product_id, sort_order)").order("sort_order"),
    db().from("shop_products").select("id, name").neq("status", "archived").order("name"),
    getSettings(),
  ]);
  const collections: CollectionRow[] = (cols ?? []).map((c) => ({ ...c, productIds: ((c.items ?? []) as { product_id: string; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order).map((i) => i.product_id) }));
  return (
    <>
      <PageTitle title="Homepage & content" subtitle="Hero slides, promo banners, collections and which homepage sections are shown. Changes go live immediately." />
      <div className="space-y-10">
        <section><h2 className="mb-3 text-lg font-bold">Banners</h2><BannerManager rows={(banners ?? []) as BannerRow[]} /></section>
        <section><h2 className="mb-3 text-lg font-bold">Collections</h2><CollectionManager rows={collections} products={products ?? []} /></section>
        <section className="max-w-3xl"><SettingsSectionForm section="homepage" title="Homepage sections" fields={HOMEPAGE_FIELDS} value={settings.homepage} /></section>
      </div>
    </>
  );
}
