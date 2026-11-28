import { PageTitle } from "@/shop/components/admin/kit";
import { CategoryManager, type CategoryRow } from "@/shop/components/admin/Managers";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Categories" };

export default async function CategoriesAdmin() {
  await requireAdminPage("products");
  const [{ data: cats }, { data: prods }] = await Promise.all([db().from("shop_categories").select("*").order("sort_order"), db().from("shop_products").select("category_id").neq("status", "archived")]);
  const counts = new Map<string, number>();
  for (const p of prods ?? []) if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  return (
    <>
      <PageTitle title="Categories" subtitle="Top-level categories appear in the store menu; subcategories appear under them." />
      <CategoryManager rows={(cats ?? []).map((c) => ({ ...c, products: counts.get(c.id) ?? 0 })) as CategoryRow[]} />
    </>
  );
}
