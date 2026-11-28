import Image from "next/image";
import { Check, CircleCheck, Download, ExternalLink, FileText, Package } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { customerCanCancel, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, statusTone, TRACKING_STEPS } from "@/shop/lib/order-status";
import type { OrderRow } from "@/shop/server/orders";
import { Badge, Notice, ProductPlaceholder, type Tone } from "../ui";
import { OrderActions } from "./OrderActions";

const toneFor = (s: string): Tone => statusTone(s) as Tone;
const dt = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Order confirmation / tracking view for customers. `accessKey` is passed only to guests using the secret link. */
export function OrderDetail({ order: o, accessKey, justPlaced }: { order: OrderRow; accessKey: string | null; justPlaced?: boolean }) {
  const keyQ = accessKey ? `?key=${encodeURIComponent(accessKey)}` : "";
  const stepIndex = TRACKING_STEPS.indexOf(o.status === "pending_payment" ? "payment_confirmed" : o.status);
  const reached = (i: number) => stepIndex >= 0 && i <= stepIndex && o.status !== "pending_payment";
  const shipment = o.shipments.at(-1);
  const a = o.shipping_address;

  return (
    <div className="space-y-8">
      {justPlaced && o.status !== "pending_payment" && o.status !== "cancelled" && (
        <div className="dark-band tech-grid flex flex-col gap-4 rounded-[var(--radius-card)] p-6 sm:flex-row sm:items-center sm:p-8">
          <CircleCheck className="h-12 w-12 shrink-0 text-accent" />
          <div>
            <h2 className="text-2xl font-extrabold">Thank you, {o.customer_name.split(" ")[0]}! Your order is confirmed.</h2>
            <p className="mt-1 text-ink-300">A confirmation has been sent to {o.email}. {o.payment_method === "cod" ? `Please keep ${formatINR(o.grand_total)} ready on delivery.` : "Your payment was successful."}</p>
          </div>
        </div>
      )}
      {o.status === "pending_payment" && (
        <Notice tone="warning">
          <strong>Payment pending.</strong> Your items are reserved for a short while. Complete the payment to confirm this order — if money was debited, it will be confirmed automatically within a few minutes.
        </Notice>
      )}
      {o.status === "cancelled" && <Notice tone="danger"><strong>This order was cancelled.</strong> {o.cancel_reason}</Notice>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted">Order {o.order_number}</p>
          <p className="text-sm text-muted">Placed {dt(o.created_at)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={toneFor(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge>
            <Badge tone={toneFor(o.payment_status)}>{PAYMENT_STATUS_LABEL[o.payment_status]}</Badge>
          </div>
        </div>
        <OrderActions orderNumber={o.order_number} accessKey={accessKey} canPay={o.status === "pending_payment" && o.payment_method === "razorpay"} canCancel={customerCanCancel(o.status)} canReorder={o.status !== "pending_payment"} />
      </div>

      {!["cancelled", "refunded"].includes(o.status) && (
        <section className="card p-6" aria-label="Order progress">
          <ol className="grid grid-cols-5 gap-2">
            {TRACKING_STEPS.map((s, i) => (
              <li key={s} className="flex flex-col items-center text-center">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${reached(i) ? "bg-accent text-ink-950" : "bg-paper-2 text-ink-400"}`}>{reached(i) ? <Check className="h-4 w-4" /> : i + 1}</span>
                <span className={`mt-2 text-xs ${reached(i) ? "font-semibold" : "text-muted"}`}>{ORDER_STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
          {o.estimated_delivery_to && !["delivered"].includes(o.status) && (
            <p className="mt-5 text-center text-sm">Estimated delivery: <strong>{new Date(o.estimated_delivery_from ?? o.estimated_delivery_to).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(o.estimated_delivery_to).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong></p>
          )}
          {shipment && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3 text-sm">
              <span className="flex items-center gap-2"><Package className="h-4 w-4 text-accent-ink" /> {shipment.carrier ?? "Courier"}{shipment.tracking_number ? ` · AWB ${shipment.tracking_number}` : ""} · <span className="capitalize">{shipment.status.replace(/_/g, " ")}</span></span>
              {shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-ink">Track package <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="card px-5" aria-label="Items">
          <ul className="divide-y divide-line">
            {o.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line">
                  {i.image_url ? <Image src={i.image_url} alt="" fill sizes="64px" className="object-cover" /> : <ProductPlaceholder name={i.product_name} className="h-full w-full" />}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{i.product_name}</p>
                  {i.variant_title && <p className="text-muted">{i.variant_title}</p>}
                  {Object.entries(i.customization ?? {}).map(([k, v]) => <p key={k} className="text-muted">{k}: {String(v)}</p>)}
                  <p className="text-muted">Qty {i.quantity} × {formatINR(i.unit_price)}</p>
                </div>
                <p className="text-sm font-semibold">{formatINR(i.line_total)}</p>
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-5">
          <div className="card p-5 text-sm">
            <dl className="space-y-2">
              <Row k="Subtotal" v={formatINR(o.subtotal)} />
              {o.discount_total > 0 && <Row k={`Discount${o.coupon_code ? ` (${o.coupon_code})` : ""}`} v={`−${formatINR(o.discount_total)}`} />}
              <Row k={`Shipping${o.shipping_method_label ? ` · ${o.shipping_method_label}` : ""}`} v={o.shipping_total ? formatINR(o.shipping_total) : "Free"} />
              {o.cod_fee > 0 && <Row k="COD fee" v={formatINR(o.cod_fee)} />}
              <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold"><dt>Total</dt><dd>{formatINR(o.grand_total)}</dd></div>
              <Row k="Includes GST" v={formatINR(o.tax_total)} muted />
            </dl>
            {o.refunds.length > 0 && <p className="mt-3 text-success">Refunded: {formatINR(o.refunds.reduce((s, r) => s + r.amount, 0))}</p>}
            {o.invoice_number && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={shopHref(`/order/${o.order_number}/invoice${keyQ}`)} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 font-semibold hover:bg-paper"><FileText className="h-4 w-4" /> Invoice</a>
                <a href={shopHref(`/order/${o.order_number}/invoice${keyQ}${keyQ ? "&" : "?"}download=1`)} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 font-semibold hover:bg-paper"><Download className="h-4 w-4" /> Download</a>
              </div>
            )}
          </div>
          <div className="card p-5 text-sm">
            <h3 className="font-bold">Delivering to</h3>
            <p className="mt-2 leading-relaxed text-muted">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            {o.gstin && <p className="mt-3 text-muted">GSTIN: <span className="font-mono text-text">{o.gstin}</span>{o.business_name ? ` · ${o.business_name}` : ""}</p>}
          </div>
          <div className="card p-5 text-sm">
            <h3 className="font-bold">Order history</h3>
            <ol className="mt-3 space-y-3">
              {o.events.filter((e) => e.is_customer_visible).map((e) => (
                <li key={e.id} className="border-l-2 border-accent/40 pl-3">
                  <p className="font-medium">{e.status ? ORDER_STATUS_LABEL[e.status] : e.payment_status ? PAYMENT_STATUS_LABEL[e.payment_status] : "Update"}</p>
                  {e.note && <p className="text-muted">{e.note}</p>}
                  <p className="text-xs text-muted">{dt(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div className={`flex justify-between ${muted ? "text-xs text-muted" : ""}`}><dt className={muted ? "" : "text-muted"}>{k}</dt><dd>{v}</dd></div>;
}
