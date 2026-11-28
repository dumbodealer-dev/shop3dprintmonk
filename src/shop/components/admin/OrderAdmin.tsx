"use client";

import { useState } from "react";
import { FileText, Truck } from "lucide-react";
import { shopHref } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, type OrderStatus } from "@/shop/lib/order-status";
import { cancelOrderAction, clearReviewFlagAction, generateInvoiceAction, orderNoteAction, orderStatusAction, refundAction, shipmentAction, shiprocketShipmentAction } from "@/shop/server/admin/actions";
import { Btn, F, inputCls, ResultNote, Toggle, useAdminAction } from "./kit";

type Shipment = { id: string; carrier: string | null; tracking_number: string | null; tracking_url: string | null; status: string };

export function OrderAdminPanel(props: {
  orderId: string; status: OrderStatus; paymentStatus: string; paymentMethod: string; grandTotal: number; refunded: number; invoiceNumber: string | null;
  needsReview: boolean; shipments: Shipment[]; canRefund: boolean; shiprocket: boolean;
}) {
  const a = useAdminAction();
  const next = ORDER_TRANSITIONS[props.status].filter((s) => s !== "cancelled" && s !== "refunded");
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(false);
  const last = props.shipments.at(-1);
  const [ship, setShip] = useState({ id: last?.id ?? null, carrier: last?.carrier ?? "", trackingNumber: last?.tracking_number ?? "", trackingUrl: last?.tracking_url ?? "", status: last?.status ?? "packed", markOrderShipped: !["shipped", "delivered"].includes(props.status) });
  const [refund, setRefund] = useState({ amount: String(Math.max(0, props.grandTotal - props.refunded)), reason: "", restock: false });
  const [cancel, setCancel] = useState({ reason: "", refund: true, restock: true });
  const paid = ["paid", "partially_refunded"].includes(props.paymentStatus);

  return (
    <div className="space-y-5">
      <ResultNote result={a.result} />
      {props.needsReview && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Flagged for review</p>
          <p className="mt-1">The payment amount differs from the order total, or payment arrived after the order expired (stock may have been released). Check stock and payment before fulfilling.</p>
          <Btn variant="outline" className="mt-3" pending={a.pending} onClick={() => a.run(() => clearReviewFlagAction(props.orderId))}>Mark as reviewed</Btn>
        </div>
      )}

      <section className="card p-5">
        <h2 className="font-bold">Update status</h2>
        <p className="mt-1 text-sm text-muted">Currently <strong>{ORDER_STATUS_LABEL[props.status]}</strong>. Customers are emailed when an order ships or is delivered.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((s) => (
            <Btn key={s} variant={s === "shipped" || s === "delivered" ? "accent" : "outline"} pending={a.pending} onClick={() => a.run(() => orderStatusAction(props.orderId, s), { confirm: s === "payment_confirmed" && props.paymentMethod === "razorpay" ? "Confirm payment manually? Only do this if you've verified the money was received." : undefined })}>
              {s === "payment_confirmed" ? "Confirm payment" : `Mark ${ORDER_STATUS_LABEL[s].toLowerCase()}`}
            </Btn>
          ))}
          {!next.length && <span className="text-sm text-muted">No further status changes.</span>}
        </div>
      </section>

      {!["cancelled", "refunded", "pending_payment"].includes(props.status) && (
        <section className="card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4" /> Shipping & tracking</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <F label="Courier"><input className={inputCls} list="carriers" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} /></F>
            <datalist id="carriers">{["Delhivery", "Blue Dart", "DTDC", "India Post (Speed Post)", "Xpressbees", "Ekart", "Shiprocket", "Self delivery"].map((c) => <option key={c} value={c} />)}</datalist>
            <F label="Tracking / AWB number"><input className={inputCls} value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} /></F>
            <F label="Tracking link" hint="Auto-filled for common couriers"><input className={inputCls} value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} /></F>
            <F label="Shipment status"><select className={inputCls} value={ship.status} onChange={(e) => setShip({ ...ship, status: e.target.value })}>{["pending", "packed", "shipped", "in_transit", "out_for_delivery", "delivered", "returned", "cancelled"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></F>
          </div>
          {!["shipped", "delivered"].includes(props.status) && <div className="mt-3"><Toggle label="Also mark the order as shipped and email the customer" checked={ship.markOrderShipped} onChange={(v) => setShip({ ...ship, markOrderShipped: v })} /></div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn pending={a.pending} onClick={() => a.run(() => shipmentAction(props.orderId, ship))}>{ship.id ? "Update shipment" : "Save shipment"}</Btn>
            {props.shiprocket && <Btn variant="outline" pending={a.pending} onClick={() => a.run(() => shiprocketShipmentAction(props.orderId), { confirm: "Create this shipment in Shiprocket and request an AWB?" })}>Create via Shiprocket</Btn>}
            {ship.id && <Btn variant="outline" onClick={() => setShip({ id: null, carrier: "", trackingNumber: "", trackingUrl: "", status: "packed", markOrderShipped: false })}>Add another parcel</Btn>}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4" /> Invoice</h2>
        {props.invoiceNumber ? (
          <p className="mt-2 text-sm">GST invoice <strong>{props.invoiceNumber}</strong> · <a href={shopHref(`/admin/api/orders/${props.orderId}/invoice`)} target="_blank" rel="noopener" className="font-semibold text-accent-ink underline">Open / print</a></p>
        ) : (
          <div className="mt-2 text-sm text-muted">
            Not issued yet (issued automatically when an online payment succeeds, or when COD is delivered).
            {["paid", "cod_pending", "partially_refunded"].includes(props.paymentStatus) && <Btn variant="outline" className="ml-2" pending={a.pending} onClick={() => a.run(() => generateInvoiceAction(props.orderId))}>Generate now</Btn>}
          </div>
        )}
      </section>

      {props.canRefund && paid && props.grandTotal - props.refunded > 0 && (
        <section className="card p-5">
          <h2 className="font-bold">Refund</h2>
          <p className="mt-1 text-sm text-muted">{props.paymentMethod === "razorpay" ? "Sent back to the customer's original payment method through Razorpay." : "COD: record the refund here after transferring the money (UPI / bank)."} Refunded so far: {formatINR(props.refunded)}.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
            <F label="Amount ₹"><input className={inputCls} inputMode="decimal" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></F>
            <F label="Reason"><input className={inputCls} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} placeholder="Damaged in transit, returned…" /></F>
          </div>
          <div className="mt-3"><Toggle label="Return the items to stock" checked={refund.restock} onChange={(v) => setRefund({ ...refund, restock: v })} /></div>
          <Btn variant="danger" className="mt-3" pending={a.pending} onClick={() => a.run(() => refundAction(props.orderId, refund), { confirm: `Refund ₹${refund.amount}? This can't be undone.` })}>Refund ₹{refund.amount || 0}</Btn>
        </section>
      )}

      {!["shipped", "delivered", "cancelled", "refunded"].includes(props.status) && (
        <section className="card p-5">
          <h2 className="font-bold">Cancel order</h2>
          <F label="Reason (shown to the customer)" className="mt-3"><input className={inputCls} value={cancel.reason} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} /></F>
          <div className="mt-3 space-y-2">
            <Toggle label="Return items to stock" checked={cancel.restock} onChange={(v) => setCancel({ ...cancel, restock: v })} />
            {paid && <Toggle label={`Refund the full ${formatINR(props.grandTotal - props.refunded)}`} checked={cancel.refund} onChange={(v) => setCancel({ ...cancel, refund: v })} />}
          </div>
          <Btn variant="danger" className="mt-3" pending={a.pending} onClick={() => a.run(() => cancelOrderAction(props.orderId, cancel), { confirm: "Cancel this order and notify the customer?" })}>Cancel order</Btn>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-bold">Add a note</h2>
        <textarea className={`${inputCls} mt-3`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note, or an update for the customer" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Toggle label="Show to customer on the order page" checked={visible} onChange={setVisible} />
          <Btn variant="outline" pending={a.pending} disabled={!note.trim()} onClick={() => a.run(() => orderNoteAction(props.orderId, note, visible), { onOk: () => setNote("") })}>Add note</Btn>
        </div>
      </section>
    </div>
  );
}
