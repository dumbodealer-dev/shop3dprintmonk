import "server-only";
import { shopUrl } from "@/shop/config";
import { round2, toPaise, fromPaise } from "@/shop/lib/money";
import { ORDER_TRANSITIONS, type OrderStatus, type PaymentStatus } from "@/shop/lib/order-status";
import { safeEqual } from "./auth/crypto";
import { clearCart } from "./cart";
import { db, must, ShopError } from "./db";
import { shopIntegrations } from "./env";
import * as notify from "./notifications";
import * as razorpay from "./payments/razorpay";
import { getSettings } from "./settings";
import { trackingUrl } from "./shipping";

export const ORDER_SELECT = `*,
  items:shop_order_items (*),
  events:shop_order_events (*),
  shipments:shop_shipments (*),
  payments:shop_payments (id, provider, provider_order_id, provider_payment_id, amount, status, method, error_description, created_at),
  refunds:shop_refunds (*)`;

export type OrderItemRow = {
  id: string; product_id: string | null; variant_id: string | null; product_name: string; variant_title: string | null; sku: string | null;
  image_url: string | null; hsn_code: string | null; quantity: number; unit_price: number; customization: Record<string, unknown>;
  line_subtotal: number; discount: number; tax_rate: number; tax_amount: number; line_total: number;
};
export type ShipmentRow = { id: string; provider: string; carrier: string | null; tracking_number: string | null; tracking_url: string | null; status: string; shipped_at: string | null; delivered_at: string | null; created_at: string };
export type OrderRow = {
  id: string; order_number: string; access_key: string; owner_key: string | null; customer_id: string | null; email: string; phone: string; customer_name: string;
  status: OrderStatus; payment_status: PaymentStatus; payment_method: "razorpay" | "cod";
  shipping_address: notify.EmailOrder["shipping_address"]; billing_address: notify.EmailOrder["shipping_address"];
  gstin: string | null; business_name: string | null; shipping_method: string; shipping_method_label: string | null;
  estimated_delivery_from: string | null; estimated_delivery_to: string | null;
  subtotal: number; discount_total: number; shipping_total: number; cod_fee: number; tax_total: number; grand_total: number;
  prices_include_tax: boolean; tax_breakdown: { type?: "intra" | "inter"; cgst?: number; sgst?: number; igst?: number; taxableValue?: number; byRate?: { rate: number; taxable: number; tax: number }[] };
  coupon_code: string | null; notes: string | null; invoice_number: string | null; invoice_date: string | null; stock_released: boolean; needs_review: boolean;
  paid_at: string | null; cancelled_at: string | null; cancel_reason: string | null; created_at: string; updated_at: string;
  items: OrderItemRow[];
  events: { id: string; status: OrderStatus | null; payment_status: PaymentStatus | null; note: string | null; actor: string; is_customer_visible: boolean; created_at: string }[];
  shipments: ShipmentRow[];
  payments: { id: string; provider: string; provider_order_id: string | null; provider_payment_id: string | null; amount: number; status: string; method: string | null; error_description: string | null; created_at: string }[];
  refunds: { id: string; amount: number; reason: string | null; status: string; provider_refund_id: string | null; created_at: string }[];
};

function normalize(o: OrderRow): OrderRow {
  const n = (v: unknown) => Number(v ?? 0);
  return {
    ...o,
    subtotal: n(o.subtotal), discount_total: n(o.discount_total), shipping_total: n(o.shipping_total), cod_fee: n(o.cod_fee), tax_total: n(o.tax_total), grand_total: n(o.grand_total),
    items: (o.items ?? []).map((i) => ({ ...i, unit_price: n(i.unit_price), line_subtotal: n(i.line_subtotal), discount: n(i.discount), tax_rate: n(i.tax_rate), tax_amount: n(i.tax_amount), line_total: n(i.line_total) })),
    events: (o.events ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    shipments: (o.shipments ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    payments: (o.payments ?? []).map((p) => ({ ...p, amount: n(p.amount) })).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    refunds: (o.refunds ?? []).map((r) => ({ ...r, amount: n(r.amount) })),
  };
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("shop_orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  return data ? normalize(data as OrderRow) : null;
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  if (!/^[A-Z]{2}-\d{6}-[A-Z0-9]{5}$/.test(orderNumber)) return null;
  const { data } = await db().from("shop_orders").select(ORDER_SELECT).eq("order_number", orderNumber).maybeSingle();
  return data ? normalize(data as OrderRow) : null;
}

/** An order is visible to its signed-in owner, or to anyone holding the secret link from the confirmation email. */
export async function getOrderForViewer(orderNumber: string, key: string | null | undefined, customerId: string | null): Promise<OrderRow | null> {
  const o = await getOrderByNumber(orderNumber);
  if (!o) return null;
  if (customerId && o.customer_id === customerId) return o;
  if (key && safeEqual(key, o.access_key)) return o;
  return null;
}

export async function listCustomerOrders(customerId: string) {
  const { data } = await db()
    .from("shop_orders")
    .select("id, order_number, status, payment_status, payment_method, grand_total, created_at, items:shop_order_items (product_name, quantity, image_url)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as { id: string; order_number: string; status: OrderStatus; payment_status: PaymentStatus; payment_method: string; grand_total: number; created_at: string; items: { product_name: string; quantity: number; image_url: string | null }[] }[];
}

export const toEmailOrder = (o: OrderRow): notify.EmailOrder => ({ ...o, items: o.items });
export const adminOrderUrl = (o: { id: string }) => shopUrl(`/admin/orders/${o.id}`);

export async function addEvent(orderId: string, e: { status?: OrderStatus | null; payment_status?: PaymentStatus | null; note?: string | null; actor?: string; visible?: boolean }) {
  await db().from("shop_order_events").insert({
    order_id: orderId,
    status: e.status ?? null,
    payment_status: e.payment_status ?? null,
    note: e.note ?? null,
    actor: e.actor ?? "system",
    is_customer_visible: e.visible ?? true,
  });
}

/** Emails + cart clean-up once an order is confirmed (prepaid after payment, COD right away). */
async function afterConfirmed(o: OrderRow, paid: boolean) {
  if (o.owner_key) await clearCart(o.owner_key).catch((e) => console.error("[shop] clear cart failed:", e));
  const email = toEmailOrder(o);
  await Promise.allSettled([
    notify.sendOrderConfirmation(email),
    paid ? notify.sendPaymentSuccess(email) : Promise.resolve(),
    notify.sendAdminNewOrder(email, adminOrderUrl(o)),
    checkLowStock(o.items.map((i) => i.variant_id).filter(Boolean) as string[]),
  ]);
}

export async function confirmCodOrder(orderId: string) {
  const o = await getOrderById(orderId);
  if (o) await afterConfirmed(o, false);
}

/**
 * Records a verified online payment. Safe to call many times (browser callback,
 * webhook, reconciliation): only the first call sends emails and creates the invoice.
 */
export async function finalizePaidOrder(orderId: string, p: { providerOrderId: string; providerPaymentId: string; amountPaise: number; method: string | null; raw: unknown }) {
  const res = must(
    await db().rpc("shop_mark_order_paid", {
      p_order_id: orderId,
      p_provider_order_id: p.providerOrderId,
      p_provider_payment_id: p.providerPaymentId,
      p_amount: fromPaise(p.amountPaise),
      p_method: p.method,
      p_raw: p.raw ?? {},
    }),
    "mark paid",
  ) as { transitioned: boolean; order_number: string; late?: boolean };
  if (!res.transitioned) return { transitioned: false };
  const settings = await getSettings();
  if (settings.tax.enableGstInvoice) await db().rpc("shop_assign_invoice_number", { p_order_id: orderId, p_prefix: settings.store.invoicePrefix });
  const o = await getOrderById(orderId);
  if (o) await afterConfirmed(o, true);
  return { transitioned: true };
}

export async function recordPaymentFailure(orderId: string, payment: razorpay.RazorpayPayment) {
  const { data: existing } = await db().from("shop_payments").select("id, status, provider_payment_id").eq("provider_order_id", payment.order_id).maybeSingle();
  if (existing?.status === "captured") return; // a later attempt succeeded
  if (existing?.provider_payment_id === payment.id && existing.status === "failed") return; // already recorded
  await db()
    .from("shop_payments")
    .update({ status: "failed", provider_payment_id: payment.id, method: payment.method, error_code: payment.error_code ?? null, error_description: payment.error_description ?? null })
    .eq("provider_order_id", payment.order_id);
  const o = await getOrderById(orderId);
  if (!o || o.payment_status === "paid") return;
  await db().from("shop_orders").update({ payment_status: "failed" }).eq("id", orderId).eq("payment_status", "pending");
  await addEvent(orderId, { payment_status: "failed", note: `Payment attempt failed${payment.error_description ? `: ${payment.error_description}` : ""}` });
  await notify.sendPaymentFailed(toEmailOrder(o));
}

/** Low-stock email for variants that just crossed their threshold. */
export async function checkLowStock(variantIds: string[]) {
  if (!variantIds.length) return;
  const { data } = await db().from("shop_variants").select("sku, stock, low_stock_threshold, track_inventory, product:shop_products (name)").in("id", variantIds);
  const low = ((data ?? []) as unknown as { sku: string; stock: number; low_stock_threshold: number; track_inventory: boolean; product: { name: string } | null }[])
    .filter((v) => v.track_inventory && v.stock <= v.low_stock_threshold)
    .map((v) => ({ name: v.product?.name ?? v.sku, sku: v.sku, stock: v.stock }));
  await notify.sendAdminLowStock(low);
}

// ── Status changes (admin + customer) ─────────────────────────────────────
export async function updateOrderStatus(orderId: string, next: OrderStatus, actor: string, note?: string | null) {
  const o = await getOrderById(orderId);
  if (!o) throw new ShopError("Order not found.", 404);
  if (next === o.status) return o;
  if (next === "cancelled") return cancelOrder(orderId, { actor, reason: note ?? null });
  if (next === "refunded") throw new ShopError("Use “Refund” to refund an order.", 400);
  if (!ORDER_TRANSITIONS[o.status].includes(next)) throw new ShopError(`An order can't move from ${o.status} to ${next}.`, 409);
  if (o.status === "pending_payment" && o.payment_method === "razorpay" && next !== "payment_confirmed")
    throw new ShopError("Confirm the payment first.", 409);

  const patch: Record<string, unknown> = { status: next };
  if (next === "payment_confirmed" && o.payment_status !== "paid") {
    patch.payment_status = "paid";
    patch.paid_at = new Date().toISOString();
  }
  // COD: cash collected on delivery.
  if (next === "delivered" && o.payment_status === "cod_pending") {
    patch.payment_status = "paid";
    patch.paid_at = new Date().toISOString();
  }
  must(await db().from("shop_orders").update(patch).eq("id", orderId).eq("status", o.status), "update status");
  await addEvent(orderId, { status: next, payment_status: (patch.payment_status as PaymentStatus) ?? null, note: note ?? null, actor });

  const settings = await getSettings();
  if (patch.payment_status === "paid" && settings.tax.enableGstInvoice) await db().rpc("shop_assign_invoice_number", { p_order_id: orderId, p_prefix: settings.store.invoicePrefix });

  const fresh = (await getOrderById(orderId))!;
  if (next === "shipped") {
    const s = fresh.shipments.at(-1);
    await notify.sendOrderShipped(toEmailOrder(fresh), { carrier: s?.carrier ?? null, tracking_number: s?.tracking_number ?? null, tracking_url: s?.tracking_url ?? null });
    if (s && s.status !== "delivered") await db().from("shop_shipments").update({ status: "shipped", shipped_at: s.shipped_at ?? new Date().toISOString() }).eq("id", s.id);
  }
  if (next === "delivered") {
    const s = fresh.shipments.at(-1);
    if (s) await db().from("shop_shipments").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", s.id);
    await notify.sendOrderDelivered(toEmailOrder(fresh));
  }
  if (next === "payment_confirmed" && o.status === "pending_payment") await afterConfirmed(fresh, true);
  return fresh;
}

/** Cancels an order, returns its stock and (for paid online orders) optionally refunds it in full. */
export async function cancelOrder(orderId: string, opts: { actor: string; reason: string | null; refund?: boolean; restock?: boolean }) {
  const o = await getOrderById(orderId);
  if (!o) throw new ShopError("Order not found.", 404);
  if (o.status === "cancelled" || o.status === "refunded") return o;
  if (["shipped", "delivered"].includes(o.status)) throw new ShopError("Shipped orders can't be cancelled — process a return/refund instead.", 409);

  if (opts.restock !== false) await db().rpc("shop_release_order_stock", { p_order_id: orderId, p_reason: "cancellation", p_release_coupon: true });
  must(
    await db().from("shop_orders").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: opts.reason }).eq("id", orderId).eq("status", o.status),
    "cancel",
  );
  await addEvent(orderId, { status: "cancelled", note: opts.reason ? `Cancelled: ${opts.reason}` : "Cancelled", actor: opts.actor });

  let refundNote: string | null = null;
  if (o.payment_status === "paid" && (opts.refund ?? true)) {
    const r = await refundOrder(orderId, { amount: o.grand_total, reason: opts.reason ?? "Order cancelled", actor: opts.actor, adminId: null, silent: true, markStatus: false }).catch((e) => {
      console.error("[shop] auto refund failed:", e);
      return null;
    });
    refundNote = r ? `A refund of ₹${o.grand_total} has been issued to your original payment method.` : "Our team will process your refund shortly.";
  }
  const fresh = (await getOrderById(orderId))!;
  await notify.sendOrderCancelled(toEmailOrder(fresh), opts.reason, refundNote);
  return fresh;
}

/** Refund (full or partial) through Razorpay, or recorded as a manual refund for COD / bank transfers. */
export async function refundOrder(orderId: string, opts: { amount: number; reason: string; actor: string; adminId: string | null; restock?: boolean; silent?: boolean; markStatus?: boolean }) {
  const o = await getOrderById(orderId);
  if (!o) throw new ShopError("Order not found.", 404);
  const refunded = o.refunds.filter((r) => r.status !== "failed").reduce((s, r) => s + r.amount, 0);
  const amount = round2(opts.amount);
  if (amount <= 0) throw new ShopError("Enter a refund amount.", 422);
  if (amount > round2(o.grand_total - refunded) + 0.001) throw new ShopError(`You can refund at most ₹${round2(o.grand_total - refunded)}.`, 422);
  if (!["paid", "partially_refunded"].includes(o.payment_status)) throw new ShopError("Only paid orders can be refunded.", 409);

  const captured = o.payments.find((p) => p.status === "captured" && p.provider === "razorpay" && p.provider_payment_id);
  let providerRefundId: string | null = null;
  let status: "processed" | "pending" | "manual" = "manual";
  if (captured && shopIntegrations.razorpay) {
    const r = await razorpay.refundPayment(captured.provider_payment_id!, toPaise(amount), { order: o.order_number, reason: opts.reason.slice(0, 200) });
    providerRefundId = r.id;
    status = r.status === "processed" ? "processed" : "pending";
  }
  must(
    await db().from("shop_refunds").insert({ order_id: orderId, payment_id: captured?.id ?? null, provider_refund_id: providerRefundId, amount, reason: opts.reason, status, admin_id: opts.adminId }),
    "record refund",
  );
  const full = round2(refunded + amount) >= round2(o.grand_total);
  const patch: Record<string, unknown> = { payment_status: full ? "refunded" : "partially_refunded" };
  if (full && opts.markStatus !== false) patch.status = "refunded";
  await db().from("shop_orders").update(patch).eq("id", orderId);
  await addEvent(orderId, { status: full && opts.markStatus !== false ? "refunded" : null, payment_status: patch.payment_status as PaymentStatus, note: `Refund of ₹${amount}${status === "manual" ? " (recorded manually)" : ""}: ${opts.reason}`, actor: opts.actor });
  if (opts.restock) await db().rpc("shop_release_order_stock", { p_order_id: orderId, p_reason: "refund", p_release_coupon: false });
  if (!opts.silent) await notify.sendRefundProcessed(toEmailOrder(o), amount);
  return { amount, status };
}

export async function upsertShipment(orderId: string, s: { id?: string | null; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; status: string; provider?: string; providerRef?: string | null }, actor: string) {
  const row = {
    order_id: orderId,
    carrier: s.carrier,
    tracking_number: s.trackingNumber,
    tracking_url: s.trackingUrl || trackingUrl(s.carrier, s.trackingNumber),
    status: s.status,
    provider: s.provider ?? "manual",
    provider_ref: s.providerRef ?? null,
    ...(s.status === "shipped" || s.status === "in_transit" ? { shipped_at: new Date().toISOString() } : {}),
    ...(s.status === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
  };
  if (s.id) must(await db().from("shop_shipments").update(row).eq("id", s.id).eq("order_id", orderId), "update shipment");
  else must(await db().from("shop_shipments").insert(row), "add shipment");
  await addEvent(orderId, { note: `Shipment ${s.id ? "updated" : "added"}: ${[s.carrier, s.trackingNumber, s.status].filter(Boolean).join(" · ")}`, actor, visible: false });
}

/**
 * Releases stock held by unpaid online orders after the configured window.
 * Before cancelling, asks Razorpay whether a payment actually succeeded (in case
 * a webhook was missed) and confirms the order instead.
 */
export async function expireUnpaidOrders() {
  const settings = await getSettings();
  const cutoff = new Date(Date.now() - settings.payments.pendingPaymentMinutes * 60_000).toISOString();
  const { data } = await db()
    .from("shop_orders")
    .select("id, order_number, payments:shop_payments (provider_order_id)")
    .eq("status", "pending_payment")
    .eq("payment_method", "razorpay")
    .lt("created_at", cutoff)
    .limit(100);
  let expired = 0;
  let recovered = 0;
  for (const o of (data ?? []) as unknown as { id: string; order_number: string; payments: { provider_order_id: string | null }[] }[]) {
    const rzpOrder = o.payments.find((p) => p.provider_order_id)?.provider_order_id;
    if (rzpOrder && shopIntegrations.razorpay) {
      const pays = await razorpay.fetchOrderPayments(rzpOrder).catch(() => null);
      const ok = pays?.items.find((p) => p.status === "captured");
      if (ok) {
        await finalizePaidOrder(o.id, { providerOrderId: rzpOrder, providerPaymentId: ok.id, amountPaise: ok.amount, method: ok.method, raw: ok });
        recovered++;
        continue;
      }
      if (pays === null) continue; // Razorpay unreachable: try again next run
    }
    await db().rpc("shop_release_order_stock", { p_order_id: o.id, p_reason: "payment_expired", p_release_coupon: true });
    await db().from("shop_orders").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Payment not completed in time" }).eq("id", o.id).eq("status", "pending_payment");
    await addEvent(o.id, { status: "cancelled", note: "Payment not completed in time — reserved items released" });
    expired++;
  }
  return { expired, recovered };
}
