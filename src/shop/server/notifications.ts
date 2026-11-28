import "server-only";
import { esc, layout, rows, sendEmail, type SendResult } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { shopUrl } from "@/shop/config";
import { formatINR } from "@/shop/lib/money";
import { isHttpsUrl } from "@/shop/lib/url";
import { getSettings } from "./settings";

/**
 * Transactional shop emails, sent through the site's existing Resend setup
 * (RESEND_API_KEY / EMAIL_FROM). Failures are logged and never break the flow
 * that triggered them (orders and payments are already saved first).
 */

export type EmailOrder = {
  order_number: string;
  access_key: string;
  customer_name: string;
  email: string;
  phone: string;
  payment_method: string;
  payment_status: string;
  status: string;
  grand_total: number;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  cod_fee: number;
  tax_total: number;
  coupon_code: string | null;
  shipping_address: { fullName: string; line1: string; line2?: string | null; city: string; state: string; pincode: string; phone: string };
  shipping_method_label: string | null;
  estimated_delivery_to: string | null;
  invoice_number?: string | null;
  items: { product_name: string; variant_title: string | null; quantity: number; line_total: number; customization: Record<string, unknown> }[];
};

const btn = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#ff6a13;color:#0c0806;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;
const p = (html: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${html}</p>`;
const small = (html: string) => `<p style="font-size:12px;line-height:1.6;color:#6b5d53;margin:16px 0 0">${html}</p>`;

export const orderLink = (o: { order_number: string; access_key: string }) => shopUrl(`/order/${encodeURIComponent(o.order_number)}?key=${encodeURIComponent(o.access_key)}`);

function itemsTable(o: EmailOrder) {
  const lines = o.items
    .map((i) => {
      const custom = Object.entries(i.customization ?? {})
        .map(([, v]) => (v === true ? "" : String(v)))
        .filter(Boolean)
        .join(" · ");
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #f2ebe4;font-size:14px">${esc(i.product_name)}${i.variant_title ? ` <span style="color:#6b5d53">— ${esc(i.variant_title)}</span>` : ""}${custom ? `<br><span style="color:#6b5d53;font-size:12px">${esc(custom)}</span>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #f2ebe4;font-size:14px;text-align:center">× ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #f2ebe4;font-size:14px;text-align:right">${formatINR(i.line_total)}</td></tr>`;
    })
    .join("");
  const sum = (label: string, v: number, bold = false) =>
    `<tr><td colspan="2" style="padding:4px 0;font-size:14px;${bold ? "font-weight:700" : "color:#6b5d53"}">${esc(label)}</td><td style="padding:4px 0;font-size:14px;text-align:right;${bold ? "font-weight:700" : ""}">${formatINR(v)}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${lines}
${sum("Subtotal", o.subtotal)}${o.discount_total > 0 ? sum(`Discount${o.coupon_code ? ` (${o.coupon_code})` : ""}`, -o.discount_total) : ""}
${sum(`Shipping${o.shipping_method_label ? ` — ${o.shipping_method_label}` : ""}`, o.shipping_total)}${o.cod_fee > 0 ? sum("Cash on delivery fee", o.cod_fee) : ""}
${sum("Total (incl. GST)", o.grand_total, true)}<tr><td colspan="3" style="font-size:12px;color:#6b5d53;padding-top:2px">Includes GST of ${formatINR(o.tax_total)}</td></tr></table>`;
}

const address = (a: EmailOrder["shipping_address"]) =>
  `${esc(a.fullName)}<br>${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ""}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br>${esc(a.phone)}`;

async function adminRecipients() {
  const s = await getSettings();
  return s.notifications.adminEmails.length ? s.notifications.adminEmails : serverEnv.businessNotificationEmails;
}

async function toCustomer(to: string, subject: string, title: string, body: string, text: string): Promise<SendResult> {
  const s = await getSettings();
  if (!s.notifications.customerEmails) return { ok: false, error: "customer emails disabled in settings" };
  const support = s.store.supportEmail || s.store.email;
  const res = await sendEmail({
    to: [to],
    subject,
    html: layout(title, `${body}${support ? small(`Questions? Reply to this email or write to <a href="mailto:${esc(support)}">${esc(support)}</a>.`) : ""}`),
    text,
    replyTo: support || undefined,
  });
  if (!res.ok) console.error(`[shop] email "${subject}" to customer failed:`, res.error);
  return res;
}

// ── Account emails ─────────────────────────────────────────────────────────
export function sendWelcomeVerification(c: { email: string; fullName: string }, token: string) {
  const link = shopUrl(`/account/verify?token=${encodeURIComponent(token)}`);
  return toCustomer(
    c.email,
    "Welcome to the 3D PRINTMONK Shop — confirm your email",
    "Welcome to the 3D PRINTMONK Shop",
    p(`Hi ${esc(c.fullName.split(" ")[0])},`) + p("Thanks for creating an account. Please confirm your email address so we can keep your orders and account secure.") + btn(link, "Confirm my email") + small("This link is valid for 48 hours. If you didn't create an account, you can ignore this email."),
    `Confirm your email: ${link}`,
  );
}

export function sendVerification(c: { email: string; fullName: string }, token: string) {
  const link = shopUrl(`/account/verify?token=${encodeURIComponent(token)}`);
  return toCustomer(c.email, "Confirm your email address", "Confirm your email", p(`Hi ${esc(c.fullName.split(" ")[0])},`) + p("Please confirm your email address:") + btn(link, "Confirm my email") + small("Valid for 48 hours."), `Confirm your email: ${link}`);
}

export function sendPasswordReset(to: { email: string; fullName: string }, token: string, kind: "customer" | "admin" = "customer") {
  const link = shopUrl(kind === "admin" ? `/admin/reset?token=${encodeURIComponent(token)}` : `/account/reset?token=${encodeURIComponent(token)}`);
  return sendEmail({
    to: [to.email],
    subject: kind === "admin" ? "Reset your 3D PRINTMONK admin password" : "Reset your 3D PRINTMONK password",
    html: layout("Reset your password", p(`Hi ${esc(to.fullName.split(" ")[0])},`) + p("We received a request to reset your password. This link works once and expires in 1 hour.") + btn(link, "Choose a new password") + small("If you didn't ask for this, ignore this email — your password won't change.")),
    text: `Reset your password (valid 1 hour): ${link}`,
  }).then((r) => {
    if (!r.ok) console.error("[shop] password reset email failed:", r.error);
    return r;
  });
}

// ── Order emails ───────────────────────────────────────────────────────────
export function sendOrderConfirmation(o: EmailOrder) {
  const cod = o.payment_method === "cod";
  const eta = o.estimated_delivery_to ? new Date(o.estimated_delivery_to).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : null;
  return toCustomer(
    o.email,
    `Order confirmed — ${o.order_number}`,
    "Thank you for your order!",
    p(`Hi ${esc(o.customer_name.split(" ")[0])}, we've received your order <strong>${esc(o.order_number)}</strong> and our print farm is on it.`) +
      p(cod ? `You chose <strong>Cash on Delivery</strong> — please keep ${formatINR(o.grand_total)} ready when it arrives.` : "Your payment was successful.") +
      (eta ? p(`Estimated delivery: <strong>by ${esc(eta)}</strong>`) : "") +
      itemsTable(o) +
      `<h2 style="font-size:15px;margin:16px 0 6px">Delivering to</h2><p style="font-size:14px;line-height:1.6;margin:0">${address(o.shipping_address)}</p>` +
      btn(orderLink(o), "View or track your order"),
    `Order ${o.order_number} confirmed. Total ${formatINR(o.grand_total)}. Track: ${orderLink(o)}`,
  );
}

export function sendPaymentSuccess(o: EmailOrder) {
  return toCustomer(
    o.email,
    `Payment received — ${o.order_number}`,
    "Payment received",
    p(`We've received your payment of <strong>${formatINR(o.grand_total)}</strong> for order <strong>${esc(o.order_number)}</strong>.`) +
      (o.invoice_number ? p(`Your GST invoice <strong>${esc(o.invoice_number)}</strong> is available on your order page.`) : "") +
      btn(orderLink(o), "View order & invoice"),
    `Payment of ${formatINR(o.grand_total)} received for ${o.order_number}. ${orderLink(o)}`,
  );
}

export function sendPaymentFailed(o: EmailOrder) {
  return toCustomer(
    o.email,
    `Payment not completed — ${o.order_number}`,
    "Your payment didn't go through",
    p(`The payment for order <strong>${esc(o.order_number)}</strong> (${formatINR(o.grand_total)}) was not completed. No money has been taken — if any amount was debited, your bank will reverse it automatically within 5–7 working days.`) +
      p("Your items are reserved for a short while. You can try again with UPI, card, net banking or another method.") +
      btn(orderLink(o), "Retry payment"),
    `Payment for ${o.order_number} failed. Retry: ${orderLink(o)}`,
  );
}

export function sendOrderShipped(o: EmailOrder, s: { carrier: string | null; tracking_number: string | null; tracking_url: string | null }) {
  if (s.tracking_url && !isHttpsUrl(s.tracking_url)) s = { ...s, tracking_url: null };
  return toCustomer(
    o.email,
    `Your order ${o.order_number} has shipped`,
    "Your order is on its way",
    p(`Good news, ${esc(o.customer_name.split(" ")[0])} — order <strong>${esc(o.order_number)}</strong> has been dispatched.`) +
      rows([["Courier", s.carrier], ["Tracking number", s.tracking_number]]) +
      (s.tracking_url ? btn(s.tracking_url, "Track your package") : btn(orderLink(o), "View order")) +
      (o.payment_method === "cod" ? small(`Cash on delivery: please keep ${formatINR(o.grand_total)} ready.`) : ""),
    `Order ${o.order_number} shipped via ${s.carrier ?? "courier"} ${s.tracking_number ?? ""}. ${s.tracking_url ?? orderLink(o)}`,
  );
}

export function sendOrderDelivered(o: EmailOrder) {
  return toCustomer(
    o.email,
    `Delivered — ${o.order_number}`,
    "Your order has been delivered",
    p(`Order <strong>${esc(o.order_number)}</strong> has been delivered. We hope you love it!`) +
      p("If anything isn't right, reply to this email within 7 days and we'll sort it out. Reviews help other customers — we'd love to hear what you think.") +
      btn(orderLink(o), "Rate your products"),
    `Order ${o.order_number} delivered. ${orderLink(o)}`,
  );
}

export function sendOrderCancelled(o: EmailOrder, reason: string | null, refundNote: string | null) {
  return toCustomer(
    o.email,
    `Order cancelled — ${o.order_number}`,
    "Your order has been cancelled",
    p(`Order <strong>${esc(o.order_number)}</strong> has been cancelled.${reason ? ` Reason: ${esc(reason)}` : ""}`) + (refundNote ? p(esc(refundNote)) : "") + btn(orderLink(o), "View order"),
    `Order ${o.order_number} cancelled. ${refundNote ?? ""}`,
  );
}

export function sendRefundProcessed(o: EmailOrder, amount: number) {
  return toCustomer(
    o.email,
    `Refund of ${formatINR(amount)} processed — ${o.order_number}`,
    "Your refund is on its way",
    p(`We've refunded <strong>${formatINR(amount)}</strong> for order <strong>${esc(o.order_number)}</strong> to your original payment method.`) +
      p("Refunds usually reach your account within 5–7 working days, depending on your bank."),
    `Refund of ${formatINR(amount)} processed for ${o.order_number}.`,
  );
}

// ── Team emails ────────────────────────────────────────────────────────────
export async function sendAdminNewOrder(o: EmailOrder, adminOrderUrl: string) {
  const s = await getSettings();
  if (!s.notifications.notifyOnNewOrder) return;
  const to = await adminRecipients();
  if (!to.length) return;
  const res = await sendEmail({
    to,
    subject: `🛒 New order ${o.order_number} — ${formatINR(o.grand_total)} (${o.payment_method === "cod" ? "COD" : "Prepaid"})`,
    html: layout(
      `New order ${o.order_number}`,
      rows([
        ["Customer", o.customer_name],
        ["Email", o.email],
        ["Phone", o.phone],
        ["Payment", o.payment_method === "cod" ? "Cash on delivery" : "Paid online"],
        ["Ship to", `${o.shipping_address.city}, ${o.shipping_address.state} ${o.shipping_address.pincode}`],
      ]) +
        itemsTable(o) +
        btn(adminOrderUrl, "Open in admin"),
    ),
    text: `New order ${o.order_number} ${formatINR(o.grand_total)} from ${o.customer_name}. ${adminOrderUrl}`,
    replyTo: o.email,
  });
  if (!res.ok) console.error("[shop] admin order email failed:", res.error);
}

export async function sendAdminLowStock(items: { name: string; sku: string; stock: number }[]) {
  const s = await getSettings();
  if (!s.notifications.notifyOnLowStock || !items.length) return;
  const to = await adminRecipients();
  if (!to.length) return;
  await sendEmail({
    to,
    subject: `Low stock: ${items.map((i) => i.sku).join(", ").slice(0, 120)}`,
    html: layout("Low stock alert", rows(items.map((i) => [`${i.name} (${i.sku})`, `${i.stock} left`])) + btn(shopUrl("/admin/inventory?filter=low"), "Open inventory")),
    text: items.map((i) => `${i.sku}: ${i.stock} left`).join("\n"),
  });
}
