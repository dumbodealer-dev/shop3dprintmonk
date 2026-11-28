import "server-only";
import type { CouponRule } from "@/shop/lib/pricing";
import { db } from "./db";

export type CouponRow = {
  id: string; code: string; description: string | null; type: CouponRule["type"]; value: number; max_discount: number | null;
  min_order_value: number; applies_to: CouponRule["appliesTo"]; product_ids: string[]; category_ids: string[];
  starts_at: string | null; ends_at: string | null; usage_limit: number | null; per_customer_limit: number | null;
  first_order_only: boolean; free_shipping: boolean; is_active: boolean; used_count: number;
};

export const toRule = (c: CouponRow): CouponRule => ({
  id: c.id,
  code: c.code,
  type: c.type,
  value: Number(c.value),
  maxDiscount: c.max_discount == null ? null : Number(c.max_discount),
  minOrderValue: Number(c.min_order_value ?? 0),
  appliesTo: c.applies_to,
  productIds: c.product_ids ?? [],
  categoryIds: c.category_ids ?? [],
  freeShipping: c.free_shipping,
});

/**
 * Checks everything about a coupon except the cart contents (those are checked by
 * computeTotals). Usage limits are re-checked atomically when the order is placed.
 */
export async function resolveCoupon(code: string, who: { email?: string | null; customerId?: string | null } = {}): Promise<{ ok: true; rule: CouponRule; row: CouponRow } | { ok: false; error: string }> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,40}$/.test(clean)) return { ok: false, error: "That code isn't valid." };
  const { data } = await db().from("shop_coupons").select("*").eq("code", clean).maybeSingle();
  const c = data as CouponRow | null;
  const now = Date.now();
  if (!c || !c.is_active) return { ok: false, error: "That code isn't valid." };
  if (c.starts_at && Date.parse(c.starts_at) > now) return { ok: false, error: "This code isn't active yet." };
  if (c.ends_at && Date.parse(c.ends_at) <= now) return { ok: false, error: "This code has expired." };
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return { ok: false, error: "This code has reached its usage limit." };

  const email = who.email?.toLowerCase();
  if ((c.per_customer_limit != null || c.first_order_only) && (email || who.customerId)) {
    const ident = [email ? `email.eq.${email.replace(/[,()"]/g, "")}` : null, who.customerId ? `customer_id.eq.${who.customerId}` : null].filter(Boolean).join(",");
    if (c.per_customer_limit != null) {
      const { count } = await db().from("shop_coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", c.id).or(ident);
      if ((count ?? 0) >= c.per_customer_limit) return { ok: false, error: "You've already used this code." };
    }
    if (c.first_order_only) {
      const { count } = await db()
        .from("shop_orders")
        .select("id", { count: "exact", head: true })
        .or(ident)
        .in("payment_status", ["paid", "cod_pending", "refunded", "partially_refunded"])
        .neq("status", "cancelled");
      if ((count ?? 0) > 0) return { ok: false, error: "This code is for first orders only." };
    }
  }
  return { ok: true, rule: toRule(c), row: c };
}

export function describeCoupon(c: Pick<CouponRow, "type" | "value" | "max_discount" | "min_order_value">) {
  const min = Number(c.min_order_value) > 0 ? ` on orders over ₹${Number(c.min_order_value)}` : "";
  if (c.type === "percent") return `${Number(c.value)}% off${c.max_discount ? ` (up to ₹${Number(c.max_discount)})` : ""}${min}`;
  if (c.type === "fixed") return `₹${Number(c.value)} off${min}`;
  return `Free shipping${min}`;
}
