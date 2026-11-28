import { toCsv } from "@/shop/lib/csv";
import { assertAdmin, audit } from "@/shop/server/auth/admin";
import { exportProductsCsv } from "@/shop/server/admin/products";
import { db } from "@/shop/server/db";
import { errorResponse } from "@/shop/server/http";

export const dynamic = "force-dynamic";

/** CSV exports: ?kind=products | orders | customers | newsletter (orders accept ?from=&to= dates). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind");
    let csv = "";
    if (kind === "products") {
      const a = await assertAdmin("products");
      csv = await exportProductsCsv();
      await audit(a.id, "export.products");
    } else if (kind === "orders") {
      const a = await assertAdmin("orders");
      let q = db().from("shop_orders").select("order_number, created_at, status, payment_status, payment_method, customer_name, email, phone, gstin, business_name, shipping_address, subtotal, discount_total, shipping_total, cod_fee, tax_total, grand_total, coupon_code, invoice_number, tax_breakdown").order("created_at", { ascending: false }).limit(20000);
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) q = q.gte("created_at", `${from}T00:00:00+05:30`);
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) q = q.lte("created_at", `${to}T23:59:59+05:30`);
      const { data } = await q;
      csv = toCsv([
        ["order_number", "date", "status", "payment_status", "payment_method", "customer", "email", "phone", "gstin", "business_name", "city", "state", "pincode", "subtotal", "discount", "shipping", "cod_fee", "gst", "cgst", "sgst", "igst", "total", "coupon", "invoice_number"],
        ...(data ?? []).map((o) => {
          const a = o.shipping_address as { city: string; state: string; pincode: string };
          const t = (o.tax_breakdown ?? {}) as { cgst?: number; sgst?: number; igst?: number };
          return [o.order_number, o.created_at, o.status, o.payment_status, o.payment_method, o.customer_name, o.email, o.phone, o.gstin, o.business_name, a?.city, a?.state, a?.pincode, o.subtotal, o.discount_total, o.shipping_total, o.cod_fee, o.tax_total, t.cgst ?? 0, t.sgst ?? 0, t.igst ?? 0, o.grand_total, o.coupon_code, o.invoice_number];
        }),
      ]);
      await audit(a.id, "export.orders");
    } else if (kind === "customers" || kind === "newsletter") {
      const a = await assertAdmin("customers");
      if (kind === "customers") {
        const { data } = await db().from("shop_customers").select("email, full_name, phone, status, email_verified_at, marketing_opt_in, created_at").neq("status", "deleted").order("created_at").limit(50000);
        csv = toCsv([["email", "name", "phone", "status", "verified", "marketing_opt_in", "created_at"], ...(data ?? []).map((c) => [c.email, c.full_name, c.phone, c.status, !!c.email_verified_at, c.marketing_opt_in, c.created_at])]);
      } else {
        const { data } = await db().from("shop_newsletter").select("email, status, source, created_at").order("created_at").limit(50000);
        csv = toCsv([["email", "status", "source", "created_at"], ...(data ?? []).map((n) => [n.email, n.status, n.source, n.created_at])]);
      }
      await audit(a.id, `export.${kind}`);
    } else return new Response("Unknown export", { status: 400 });
    return new Response("﻿" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
