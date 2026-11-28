import { PageTitle } from "@/shop/components/admin/kit";
import { CouponManager, type CouponRow } from "@/shop/components/admin/Managers";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Discounts" };

export default async function DiscountsAdmin() {
  await requireAdminPage("discounts");
  const [{ data: coupons }, { data: products }, { data: categories }] = await Promise.all([
    db().from("shop_coupons").select("*").order("created_at", { ascending: false }),
    db().from("shop_products").select("id, name").neq("status", "archived").order("name"),
    db().from("shop_categories").select("id, name").order("sort_order"),
  ]);
  return (
    <>
      <PageTitle title="Discounts & coupons" subtitle="Percentage, fixed-amount and free-shipping codes with limits and schedules. For product sale prices, set a sale price on the variant." />
      <CouponManager rows={(coupons ?? []).map((c) => ({ ...c, value: Number(c.value), min_order_value: Number(c.min_order_value), max_discount: c.max_discount == null ? null : Number(c.max_discount) })) as CouponRow[]} products={products ?? []} categories={categories ?? []} />
    </>
  );
}
