import { z } from "zod";
import { requireCustomer } from "@/shop/server/auth/customer";
import { db, must, ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { savedAddressSchema } from "@/shop/lib/validation";

export const dynamic = "force-dynamic";

const toRow = (a: z.infer<typeof savedAddressSchema>) => ({
  label: a.label, full_name: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, landmark: a.landmark,
  city: a.city, state: a.state, pincode: a.pincode, country: "IN", is_default_shipping: a.isDefaultShipping, is_default_billing: a.isDefaultBilling,
});

async function clearDefaults(customerId: string, a: { isDefaultShipping: boolean; isDefaultBilling: boolean }, exceptId?: string) {
  for (const col of ["is_default_shipping", "is_default_billing"] as const) {
    if (!(col === "is_default_shipping" ? a.isDefaultShipping : a.isDefaultBilling)) continue;
    let q = db().from("shop_addresses").update({ [col]: false }).eq("customer_id", customerId);
    if (exceptId) q = q.neq("id", exceptId);
    await q;
  }
}

export const GET = route(async () => {
  const c = await requireCustomer();
  const { data } = await db().from("shop_addresses").select("*").eq("customer_id", c.id).order("created_at");
  return json({ addresses: data ?? [] });
});

export const POST = route(async (req) => {
  const c = await requireCustomer();
  const a = savedAddressSchema.parse(await body(req));
  const { count } = await db().from("shop_addresses").select("id", { count: "exact", head: true }).eq("customer_id", c.id);
  if ((count ?? 0) >= 20) throw new ShopError("You can save up to 20 addresses.", 422);
  await clearDefaults(c.id, a);
  const first = (count ?? 0) === 0;
  const row = must(await db().from("shop_addresses").insert({ ...toRow(a), customer_id: c.id, is_default_shipping: a.isDefaultShipping || first, is_default_billing: a.isDefaultBilling || first }).select("*").single(), "address");
  return json({ address: row }, 201);
});

export const PATCH = route(async (req) => {
  const c = await requireCustomer();
  const raw = (await body(req)) as { id?: string };
  const id = z.uuid().parse(raw.id);
  const a = savedAddressSchema.parse(raw);
  await clearDefaults(c.id, a, id);
  must(await db().from("shop_addresses").update(toRow(a)).eq("id", id).eq("customer_id", c.id), "address");
  return json({ ok: true });
});

export const DELETE = route(async (req) => {
  const c = await requireCustomer();
  const id = z.uuid().parse(new URL(req.url).searchParams.get("id"));
  must(await db().from("shop_addresses").delete().eq("id", id).eq("customer_id", c.id), "address");
  return json({ ok: true });
});
