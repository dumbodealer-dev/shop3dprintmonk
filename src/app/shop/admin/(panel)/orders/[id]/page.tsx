import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { OrderAdminPanel } from "@/shop/components/admin/OrderAdmin";
import { Badge, type Tone } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, statusTone } from "@/shop/lib/order-status";
import { can, requireAdminPage } from "@/shop/server/auth/admin";
import { shopIntegrations } from "@/shop/server/env";
import { getOrderById } from "@/shop/server/orders";

export const metadata = { title: "Order" };

const dt = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("orders");
  const o = await getOrderById((await params).id);
  if (!o) notFound();
  const refunded = o.refunds.filter((r) => r.status !== "failed").reduce((s, r) => s + r.amount, 0);
  const addr = (a: typeof o.shipping_address) => `${a.fullName}\n${a.line1}${a.line2 ? `, ${a.line2}` : ""}\n${a.city}, ${a.state} ${a.pincode}\n${a.phone}`;
  const t = o.tax_breakdown;

  return (
    <>
      <Link href={shopHref("/admin/orders")} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink"><ArrowLeft className="h-4 w-4" /> Orders</Link>
      <PageTitle
        title={`Order ${o.order_number}`}
        subtitle={<>Placed {dt(o.created_at)} · {o.payment_method === "cod" ? "Cash on delivery" : "Online payment"}{o.coupon_code ? ` · Coupon ${o.coupon_code}` : ""}</>}
        actions={<><Badge tone={statusTone(o.status) as Tone}>{ORDER_STATUS_LABEL[o.status]}</Badge><Badge tone={statusTone(o.payment_status) as Tone}>{PAYMENT_STATUS_LABEL[o.payment_status]}</Badge></>}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card overflow-x-auto p-5">
            <h2 className="font-bold">Items</h2>
            <table className="mt-3 w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-muted"><tr><th className="py-2">Product</th><th className="py-2">SKU</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">GST</th><th className="py-2 text-right">Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id} className="border-t border-line align-top">
                    <td className="py-2.5">
                      {i.product_id ? <Link href={shopHref(`/admin/products/${i.product_id}`)} className="font-semibold hover:text-accent-ink">{i.product_name}</Link> : <span className="font-semibold">{i.product_name}</span>}
                      {i.variant_title && <span className="block text-muted">{i.variant_title}</span>}
                      {Object.entries(i.customization ?? {}).map(([k, v]) => <span key={k} className="mt-0.5 block rounded bg-amber-50 px-1.5 text-xs text-amber-950">{k}: <strong>{String(v)}</strong></span>)}
                    </td>
                    <td className="py-2.5 font-mono text-xs">{i.sku}</td>
                    <td className="py-2.5 text-right">{i.quantity}</td>
                    <td className="py-2.5 text-right">{formatINR(i.unit_price)}</td>
                    <td className="py-2.5 text-right">{i.tax_rate}%</td>
                    <td className="py-2.5 text-right font-semibold">{formatINR(i.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <Row k="Subtotal" v={formatINR(o.subtotal)} />
              {o.discount_total > 0 && <Row k="Discount" v={`−${formatINR(o.discount_total)}`} />}
              <Row k={`Shipping (${o.shipping_method_label ?? o.shipping_method})`} v={formatINR(o.shipping_total)} />
              {o.cod_fee > 0 && <Row k="COD fee" v={formatINR(o.cod_fee)} />}
              <Row k="Grand total" v={formatINR(o.grand_total)} bold />
              <Row k={t?.type === "inter" ? `IGST` : `CGST + SGST`} v={t?.type === "inter" ? formatINR(t.igst ?? 0) : `${formatINR(t?.cgst ?? 0)} + ${formatINR(t?.sgst ?? 0)}`} />
              {refunded > 0 && <Row k="Refunded" v={`−${formatINR(refunded)}`} />}
            </dl>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-5 text-sm">
              <h2 className="font-bold">Customer</h2>
              <p className="mt-2">{o.customer_name}<br /><a href={`mailto:${o.email}`} className="text-accent-ink underline">{o.email}</a><br /><a href={`tel:${o.phone}`}>{o.phone}</a></p>
              {o.customer_id ? <Link href={shopHref(`/admin/customers/${o.customer_id}`)} className="mt-2 inline-block font-semibold text-accent-ink">View customer →</Link> : <p className="mt-2 text-muted">Guest checkout</p>}
              {o.gstin && <p className="mt-3">GSTIN <span className="font-mono">{o.gstin}</span><br />{o.business_name}</p>}
              {o.notes && <p className="mt-3 rounded-lg bg-paper p-2"><strong>Customer note:</strong> {o.notes}</p>}
            </section>
            <section className="card p-5 text-sm">
              <h2 className="font-bold">Shipping address</h2>
              <p className="mt-2 whitespace-pre-line">{addr(o.shipping_address)}</p>
              <h2 className="mt-4 font-bold">Billing address</h2>
              <p className="mt-2 whitespace-pre-line text-muted">{addr(o.billing_address)}</p>
              {o.estimated_delivery_to && <p className="mt-3 text-muted">Promised by {new Date(o.estimated_delivery_to).toLocaleDateString("en-IN")}</p>}
            </section>
          </div>

          <section className="card p-5 text-sm">
            <h2 className="font-bold">Payments</h2>
            {o.payments.length ? (
              <ul className="mt-2 space-y-1">
                {o.payments.map((p) => <li key={p.id}>{p.provider} · {p.provider_payment_id ?? p.provider_order_id} · {p.method ?? "—"} · <strong>{p.status}</strong> · {formatINR(p.amount)}{p.error_description ? ` · ${p.error_description}` : ""}</li>)}
              </ul>
            ) : <p className="mt-2 text-muted">{o.payment_method === "cod" ? "Cash to be collected on delivery." : "No payment attempts yet."}</p>}
            {o.refunds.length > 0 && <ul className="mt-3 space-y-1">{o.refunds.map((r) => <li key={r.id}>Refund {formatINR(r.amount)} · {r.status} · {r.reason}</li>)}</ul>}
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-bold">History</h2>
            <ol className="mt-3 space-y-3">
              {o.events.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p><strong>{e.status ? ORDER_STATUS_LABEL[e.status] : e.payment_status ? PAYMENT_STATUS_LABEL[e.payment_status] : "Note"}</strong>{!e.is_customer_visible && <span className="ml-2 text-xs text-muted">(internal)</span>}</p>
                  {e.note && <p className="text-muted">{e.note}</p>}
                  <p className="text-xs text-muted">{dt(e.created_at)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <OrderAdminPanel
          orderId={o.id}
          status={o.status}
          paymentStatus={o.payment_status}
          paymentMethod={o.payment_method}
          grandTotal={o.grand_total}
          refunded={refunded}
          invoiceNumber={o.invoice_number}
          needsReview={o.needs_review}
          shipments={o.shipments}
          canRefund={can(admin.role, "refunds")}
          shiprocket={shopIntegrations.shiprocket}
        />
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between gap-4 ${bold ? "border-t border-line pt-1 font-extrabold" : ""}`}><dt className={bold ? "" : "text-muted"}>{k}</dt><dd>{v}</dd></div>;
}
