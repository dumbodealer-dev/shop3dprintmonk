import "server-only";
import { generateReference } from "@/lib/reference";
import { hashIp } from "@/lib/rate-limit";
import { shopHref } from "@/shop/config";
import { toPaise } from "@/shop/lib/money";
import type { CheckoutInput } from "@/shop/lib/validation";
import { getCustomer, registerCustomer, startCustomerSession } from "./auth/customer";
import { randomToken } from "./auth/crypto";
import { getCartView, getOwnerKey, type CartView } from "./cart";
import { db, must, ShopError } from "./db";
import { shopEnv, shopIntegrations } from "./env";
import { sendWelcomeVerification } from "./notifications";
import { confirmCodOrder, getOrderById } from "./orders";
import * as razorpay from "./payments/razorpay";
import { getSettings } from "./settings";
import { checkPincode, deliveryEstimate, findMethod, isoDate } from "./shipping";

export type CheckoutQuoteInput = { shippingMethod?: string; state?: string; pincode?: string; paymentMethod?: "razorpay" | "cod" | null; couponCode?: string | null; email?: string | null };

/** Live price preview for the checkout page — exactly the calculation placeOrder will use. */
export async function checkoutQuote(input: CheckoutQuoteInput) {
  const settings = await getSettings();
  const cart = await getCartView({ shippingMethod: input.shippingMethod, state: input.state, paymentMethod: input.paymentMethod ?? null, couponCode: input.couponCode, email: input.email });
  const service = input.pincode ? await checkPincode(input.pincode, settings) : null;
  const leadDays = Math.max(0, ...cart.lines.map((l) => l.leadTimeDays));
  const methods = settings.shipping.methods
    .filter((m) => m.enabled)
    .map((m) => {
      const eta = deliveryEstimate(m, settings, { leadDays, local: service?.local });
      const free = m.freeAbove != null && cart.totals.subtotal - cart.totals.discountTotal >= m.freeAbove;
      return { id: m.id, label: m.label, rate: m.rate, free: free || cart.totals.shippingFreeReason === "coupon", etaFrom: isoDate(eta.from), etaTo: isoDate(eta.to) };
    });
  const codAllowed = codAvailability(settings, cart, service);
  return { cart, service, methods, cod: codAllowed, razorpayAvailable: settings.payments.razorpayEnabled && shopIntegrations.razorpay };
}

function codAvailability(settings: Awaited<ReturnType<typeof getSettings>>, cart: CartView, service: { cod: boolean } | null) {
  if (!settings.payments.codEnabled) return { available: false, reason: "Cash on delivery is not available right now." };
  if (service && !service.cod) return { available: false, reason: "Cash on delivery isn't available for this PIN code." };
  if (settings.payments.codMaxOrderValue > 0 && cart.totals.grandTotal > settings.payments.codMaxOrderValue)
    return { available: false, reason: `Cash on delivery is available for orders up to ₹${settings.payments.codMaxOrderValue}.` };
  if (cart.lines.some((l) => Object.keys(l.customization).length)) return { available: false, reason: "Personalised items must be prepaid." };
  return { available: true, reason: null };
}

const STOCK_ERRORS: Record<string, string> = {
  SHOP_UNAVAILABLE: "An item in your cart is no longer available. Please review your cart.",
  SHOP_COUPON_INVALID: "This coupon is no longer valid.",
  SHOP_COUPON_EXHAUSTED: "This coupon has just reached its usage limit.",
  SHOP_COUPON_CUSTOMER_LIMIT: "You've already used this coupon.",
  SHOP_COUPON_FIRST_ORDER: "This coupon is for first orders only.",
};

export type PlaceOrderResult = {
  orderId: string;
  orderNumber: string;
  accessKey: string;
  redirect: string;
  payment: null | { provider: "razorpay"; keyId: string; orderId: string; amount: number; currency: "INR"; name: string; description: string; prefill: { name: string; email: string; contact: string } };
};

export async function placeOrder(input: CheckoutInput, ip: string): Promise<PlaceOrderResult> {
  const settings = await getSettings();
  const customer = await getCustomer();
  const ownerKey = await getOwnerKey(false);
  if (!ownerKey) throw new ShopError("Your cart is empty.", 409, "empty_cart");

  // Same idempotency key sent twice (double click, retry after a timeout) → return the first order.
  const { data: prior } = await db().from("shop_orders").select("id").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (prior) return resumePayment(prior.id);

  const billing = input.billingSameAsShipping || !input.billingAddress ? input.shippingAddress : input.billingAddress;
  const method = findMethod(settings, input.shippingMethod);
  const cart = await getCartView({ ownerKey, shippingMethod: method.id, state: input.shippingAddress.state /* GST place of supply */, paymentMethod: input.paymentMethod, couponCode: input.couponCode ?? null, email: input.contact.email });

  if (!cart.lines.length) throw new ShopError("Your cart is empty.", 409, "empty_cart");
  if (cart.hasIssues) throw new ShopError("Some items in your cart need attention (stock or availability changed). Please review your cart.", 409, "cart_issues");
  if (input.couponCode && cart.couponError) throw new ShopError(cart.couponError, 422, "coupon", { couponCode: cart.couponError });

  const service = await checkPincode(input.shippingAddress.pincode, settings);
  if (!service.serviceable) throw new ShopError(service.message, 422, "pincode", { "shippingAddress.pincode": service.message });

  if (input.paymentMethod === "cod") {
    const cod = codAvailability(settings, cart, service);
    if (!cod.available) throw new ShopError(cod.reason!, 422, "cod");
  } else if (!settings.payments.razorpayEnabled || !shopIntegrations.razorpay) {
    throw new ShopError("Online payment is not available right now. Please choose another payment method.", 503, "payments_unavailable");
  }

  const t = cart.totals;
  const leadDays = Math.max(0, ...cart.lines.map((l) => l.leadTimeDays));
  const eta = deliveryEstimate(method, settings, { leadDays, local: service.local });
  const accessKey = randomToken(24);
  const byId = new Map(cart.lines.map((l) => [l.id, l]));
  const items = t.lines.map((pl) => {
    const l = byId.get(pl.key)!;
    return {
      variant_id: l.variantId,
      product_id: l.productId,
      product_name: l.name,
      variant_title: l.variantTitle || null,
      sku: l.sku,
      image_url: l.imageUrl,
      hsn_code: l.hsnCode,
      quantity: pl.quantity,
      unit_price: pl.unitPrice,
      customization: Object.fromEntries(l.customizationLabels.map((c) => [c.label, c.value])),
      line_subtotal: pl.lineSubtotal,
      discount: pl.discount,
      tax_rate: pl.gstRate,
      tax_amount: pl.taxAmount,
      line_total: pl.lineTotal,
    };
  });
  const addr = (a: typeof billing) => ({ ...a, country: "IN" });

  let placed: { id: string; order_number: string; duplicate: boolean } | null = null;
  for (let attempt = 0; attempt < 4 && !placed; attempt++) {
    const orderNumber = generateReference("SO");
    const { data, error } = await db().rpc("shop_place_order", {
      p_order: {
        order_number: orderNumber,
        idempotency_key: input.idempotencyKey,
        access_key: accessKey,
        owner_key: ownerKey,
        customer_id: customer?.id ?? null,
        email: input.contact.email,
        phone: input.contact.phone,
        customer_name: input.contact.fullName,
        status: input.paymentMethod === "cod" ? "processing" : "pending_payment",
        payment_status: input.paymentMethod === "cod" ? "cod_pending" : "pending",
        payment_method: input.paymentMethod,
        shipping_address: addr(input.shippingAddress),
        billing_address: addr(billing),
        gstin: input.gstin,
        business_name: input.businessName,
        shipping_method: method.id,
        shipping_method_label: method.label,
        estimated_delivery_from: isoDate(eta.from),
        estimated_delivery_to: isoDate(eta.to),
        subtotal: t.subtotal,
        discount_total: t.discountTotal,
        shipping_total: t.shippingTotal,
        cod_fee: t.codFee,
        tax_total: t.taxTotal,
        grand_total: t.grandTotal,
        prices_include_tax: settings.tax.pricesIncludeTax,
        tax_breakdown: t.taxBreakdown,
        coupon_id: t.coupon?.applied ? (await couponId(t.coupon.code)) : null,
        coupon_code: t.coupon?.applied ? t.coupon.code : null,
        notes: input.notes,
        ip_hash: hashIp(ip),
      },
      p_items: items,
    });
    if (error) {
      if (error.code === "23505" && /order_number/.test(error.message + (error.details ?? ""))) continue;
      const [code, name, left] = (error.message ?? "").split(":");
      if (code === "SHOP_OUT_OF_STOCK") throw new ShopError(Number(left) > 0 ? `Only ${left} of “${name}” left. Please update your cart.` : `“${name}” just sold out. Please update your cart.`, 409, "stock");
      if (STOCK_ERRORS[code]) throw new ShopError(STOCK_ERRORS[code], 409, code.toLowerCase());
      console.error("[shop] place order failed:", error.code, error.message, error.details);
      throw new ShopError("We couldn't place your order. Please try again.", 500);
    }
    placed = data as { id: string; order_number: string; duplicate: boolean };
  }
  if (!placed) throw new ShopError("We couldn't place your order. Please try again.", 500);
  if (placed.duplicate) return resumePayment(placed.id);

  // Optional account creation during checkout (after the order is safely stored).
  if (input.createAccount && !customer && input.password) {
    try {
      const { customer: c, verifyToken } = await registerCustomer({ fullName: input.contact.fullName, email: input.contact.email, phone: input.contact.phone, password: input.password, marketingOptIn: input.marketingOptIn });
      await db().from("shop_orders").update({ customer_id: c.id }).eq("id", placed.id);
      await startCustomerSession(c.id);
      await sendWelcomeVerification(c, verifyToken);
    } catch (e) {
      if (!(e instanceof ShopError && e.code === "exists")) console.error("[shop] checkout account creation failed:", e);
    }
  }
  if (input.marketingOptIn) {
    await db().from("shop_newsletter").upsert({ email: input.contact.email, source: "checkout", status: "subscribed" }, { onConflict: "email", ignoreDuplicates: true }).then(() => {}, () => {});
  }

  if (input.paymentMethod === "cod") {
    await confirmCodOrder(placed.id);
    return { orderId: placed.id, orderNumber: placed.order_number, accessKey, redirect: orderPath(placed.order_number, accessKey, true), payment: null };
  }
  return startRazorpay(placed.id);
}

async function couponId(code: string) {
  const { data } = await db().from("shop_coupons").select("id").eq("code", code).maybeSingle();
  return data?.id ?? null;
}

const orderPath = (number: string, key: string, placed = false) => shopHref(`/order/${number}?key=${encodeURIComponent(key)}${placed ? "&placed=1" : ""}`);

/** Creates (or reuses) the Razorpay order for an unpaid order and returns what the browser needs to open Checkout. */
export async function startRazorpay(orderId: string): Promise<PlaceOrderResult> {
  const o = await getOrderById(orderId);
  if (!o) throw new ShopError("Order not found.", 404);
  const base = { orderId: o.id, orderNumber: o.order_number, accessKey: o.access_key, redirect: orderPath(o.order_number, o.access_key, true) };
  if (o.payment_method !== "razorpay" || o.payment_status === "paid" || o.status !== "pending_payment") return { ...base, payment: null };
  if (!shopIntegrations.razorpay) throw new ShopError("Online payment is not available right now.", 503);

  let rzpOrderId = o.payments.find((p) => p.provider === "razorpay" && p.provider_order_id && p.status !== "captured")?.provider_order_id ?? null;
  const amount = toPaise(o.grand_total);
  if (!rzpOrderId) {
    try {
      const r = await razorpay.createOrder(amount, o.order_number, { order_number: o.order_number });
      rzpOrderId = r.id;
      must(await db().from("shop_payments").insert({ order_id: o.id, provider: "razorpay", provider_order_id: r.id, amount: o.grand_total, status: "created" }), "payment row");
    } catch (e) {
      console.error("[shop] razorpay order failed:", e);
      // Don't hold stock for an order that can't be paid.
      await db().rpc("shop_release_order_stock", { p_order_id: o.id, p_reason: "payment_expired", p_release_coupon: true });
      await db().from("shop_orders").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Payment gateway unavailable" }).eq("id", o.id);
      throw new ShopError("We couldn't connect to the payment gateway. No money was taken — please try again in a minute.", 502, "gateway");
    }
  }
  const settings = await getSettings();
  return {
    ...base,
    payment: {
      provider: "razorpay",
      keyId: shopEnv.razorpay.keyId,
      orderId: rzpOrderId,
      amount,
      currency: "INR",
      name: settings.store.name,
      description: `Order ${o.order_number}`,
      prefill: { name: o.customer_name, email: o.email, contact: o.phone },
    },
  };
}

async function resumePayment(orderId: string) {
  return startRazorpay(orderId);
}
