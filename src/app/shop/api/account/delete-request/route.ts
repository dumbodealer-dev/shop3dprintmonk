import { z } from "zod";
import { requireCustomer } from "@/shop/server/auth/customer";
import { db, must } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";

/** Records an account deletion request; the team completes it in Admin → Customers (orders are kept for GST records). */
export const POST = route(
  async (req) => {
    const c = await requireCustomer();
    const { reason, cancel } = z.object({ reason: z.string().trim().max(1000).optional(), cancel: z.boolean().optional() }).parse(await body(req));
    must(
      await db().from("shop_customers").update(cancel ? { deletion_requested_at: null, deletion_reason: null } : { deletion_requested_at: new Date().toISOString(), deletion_reason: reason ?? null }).eq("id", c.id),
      "deletion request",
    );
    return json({ ok: true });
  },
  { rate: ["delete-req", 5, 60 * 60_000] },
);
