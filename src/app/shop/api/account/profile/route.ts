import { requireCustomer } from "@/shop/server/auth/customer";
import { db, must } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { normalizeIndianMobile } from "@/shop/lib/india";
import { profileSchema } from "@/shop/lib/validation";

export const PATCH = route(async (req) => {
  const c = await requireCustomer();
  const input = profileSchema.parse(await body(req));
  must(
    await db().from("shop_customers").update({ full_name: input.fullName, phone: input.phone ? normalizeIndianMobile(input.phone) : null, marketing_opt_in: input.marketingOptIn }).eq("id", c.id),
    "profile",
  );
  return json({ ok: true });
});
