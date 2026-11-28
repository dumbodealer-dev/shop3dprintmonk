import "server-only";
import { cookies } from "next/headers";
import { resolveCustomization, parseCustomizationOptions } from "@/shop/lib/customization";
import { round2 } from "@/shop/lib/money";
import { computeTotals, type CouponRule, type Totals } from "@/shop/lib/pricing";
import { stateCode } from "@/shop/lib/india";
import type { CartLineView, CustomizationInput } from "@/shop/lib/types";
import { getCustomer } from "./auth/customer";
import { randomToken, sha256 } from "./auth/crypto";
import { resolveCoupon } from "./coupons";
import { db, must, ShopError, shopConfigured } from "./db";
import { shopEnv } from "./env";
import { getSettings } from "./settings";
import { findMethod } from "./shipping";

/**
 * Server-side carts. Guests are identified by a random httpOnly cookie (only its
 * hash is stored); signed-in customers by their account, so the cart follows them
 * across devices. Prices are never stored in the cart — they're read live from
 * the catalogue every time totals are computed.
 */
export const GUEST_COOKIE = "pm_shop_cart";
export const MAX_LINE_QTY = 99;

export async function getOwnerKey(create = false): Promise<string | null> {
  const customer = await getCustomer();
  if (customer) return `c:${customer.id}`;
  const store = await cookies();
  const token = store.get(GUEST_COOKIE)?.value;
  if (token && token.length <= 100) return `g:${sha256(token)}`;
  if (!create) return null;
  const fresh = randomToken();
  store.set(GUEST_COOKIE, fresh, { httpOnly: true, secure: shopEnv.isProd, sameSite: "lax", path: "/", maxAge: 90 * 86_400, domain: shopEnv.cookieDomain });
  return `g:${sha256(fresh)}`;
}

export async function guestOwnerKey(): Promise<string | null> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return token && token.length <= 100 ? `g:${sha256(token)}` : null;
}

async function cartId(ownerKey: string, create: boolean): Promise<string | null> {
  const { data } = await db().from("shop_carts").select("id").eq("owner_key", ownerKey).maybeSingle();
  if (data) return data.id;
  if (!create) return null;
  const ins = await db().from("shop_carts").upsert({ owner_key: ownerKey }, { onConflict: "owner_key" }).select("id").single();
  return must(ins, "create cart").id;
}

type ItemRow = {
  id: string; quantity: number; customization: CustomizationInput; saved_for_later: boolean; created_at: string;
  variant: {
    id: string; sku: string; title: string; price: number; sale_price: number | null; stock: number; track_inventory: boolean; is_active: boolean;
    product: {
      id: string; slug: string; name: string; status: string; publish_at: string | null; gst_rate: number; customization: unknown;
      category_id: string | null; lead_time_days: number; hsn_code: string | null;
      category: { parent_id: string | null } | null;
      images: { url: string; sort_order: number }[];
    } | null;
  } | null;
};

const ITEM_SELECT = `id, quantity, customization, saved_for_later, created_at,
  variant:shop_variants (id, sku, title, price, sale_price, stock, track_inventory, is_active,
    product:shop_products (id, slug, name, status, publish_at, gst_rate, customization, category_id, lead_time_days, hsn_code,
      category:shop_categories (parent_id), images:shop_product_images (url, sort_order)))`;

export type CartLineInternal = CartLineView & { gstRate: number; categoryIds: string[]; leadTimeDays: number; hsnCode: string | null; savedForLater: boolean };

export type CartView = {
  ownerKey: string | null;
  lines: CartLineInternal[];
  saved: CartLineInternal[];
  itemCount: number;
  couponCode: string | null;
  couponError: string | null;
  totals: Totals;
  hasIssues: boolean;
  shippingMethodId: string;
};

export async function loadCartLines(ownerKey: string) {
  const id = await cartId(ownerKey, false);
  if (!id) return { id: null, couponCode: null, lines: [] as CartLineInternal[] };
  const [{ data: cart }, items] = await Promise.all([
    db().from("shop_carts").select("coupon_code").eq("id", id).single(),
    db().from("shop_cart_items").select(ITEM_SELECT).eq("cart_id", id).order("created_at"),
  ]);
  const settings = await getSettings();
  const rows = (must(items, "cart items") ?? []) as unknown as ItemRow[];
  const lines: CartLineInternal[] = rows.map((r) => {
    const v = r.variant;
    const p = v?.product;
    const published = !!p && p.status === "active" && (!p.publish_at || new Date(p.publish_at) <= new Date());
    const base = v ? Number(v.sale_price != null && Number(v.sale_price) < Number(v.price) ? v.sale_price : v.price) : 0;
    const custom = p ? resolveCustomization(parseCustomizationOptions(p.customization), r.customization) : null;
    const surcharge = custom?.ok ? custom.surcharge : 0;
    let issue: string | null = null;
    if (!v || !p || !published || !v.is_active) issue = "This item is no longer available.";
    else if (custom && !custom.ok) issue = "The personalisation options for this item changed — please remove it and add it again.";
    else if (v.track_inventory && v.stock <= 0) issue = "Out of stock.";
    else if (v.track_inventory && r.quantity > v.stock) issue = `Only ${v.stock} left — please reduce the quantity.`;
    const unitPrice = round2(base + surcharge);
    return {
      id: r.id,
      variantId: v?.id ?? "",
      productId: p?.id ?? "",
      slug: p?.slug ?? "",
      name: p?.name ?? "Unavailable item",
      variantTitle: v && v.title !== "Default" ? v.title : "",
      sku: v?.sku ?? "",
      imageUrl: p?.images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
      unitPrice,
      basePrice: base,
      compareAt: v && v.sale_price != null && Number(v.sale_price) < Number(v.price) ? round2(Number(v.price) + surcharge) : null,
      quantity: r.quantity,
      maxQuantity: v?.track_inventory ? Math.min(v.stock, MAX_LINE_QTY) : MAX_LINE_QTY,
      customization: r.customization ?? {},
      customizationLabels: custom?.ok ? custom.labels : [],
      lineTotal: round2(unitPrice * r.quantity),
      issue,
      gstRate: Number(p?.gst_rate ?? settings.tax.defaultGstRate),
      categoryIds: [p?.category_id, p?.category?.parent_id].filter(Boolean) as string[],
      leadTimeDays: p?.lead_time_days ?? 0,
      hsnCode: p?.hsn_code ?? null,
      savedForLater: r.saved_for_later,
    };
  });
  return { id, couponCode: cart?.coupon_code ?? null, lines };
}

/**
 * The cart with fully computed totals. Coupon, shipping method, destination state
 * and payment method can be supplied by checkout; defaults are used for the cart page.
 */
export async function getCartView(opts: { ownerKey?: string | null; shippingMethod?: string; state?: string; paymentMethod?: "razorpay" | "cod" | null; email?: string | null; couponCode?: string | null } = {}): Promise<CartView> {
  const settings = await getSettings();
  const ownerKey = opts.ownerKey !== undefined ? opts.ownerKey : shopConfigured() ? await getOwnerKey(false) : null;
  const loaded = ownerKey ? await loadCartLines(ownerKey) : { id: null, couponCode: null, lines: [] as CartLineInternal[] };
  const active = loaded.lines.filter((l) => !l.savedForLater);
  const saved = loaded.lines.filter((l) => l.savedForLater);
  const priced = active.filter((l) => !l.issue || l.issue.startsWith("Only"));

  const code = opts.couponCode !== undefined ? opts.couponCode : loaded.couponCode;
  let coupon: CouponRule | null = null;
  let couponError: string | null = null;
  if (code) {
    const customer = await getCustomer();
    const r = await resolveCoupon(code, { email: opts.email ?? customer?.email, customerId: customer?.id });
    if (r.ok) coupon = r.rule;
    else couponError = r.error;
  }
  const method = findMethod(settings, opts.shippingMethod);
  const totals = computeTotals({
    lines: priced.map((l) => ({ key: l.id, productId: l.productId, categoryIds: l.categoryIds, unitPrice: l.unitPrice, quantity: l.quantity, gstRate: l.gstRate })),
    coupon,
    shipping: { id: method.id, label: method.label, rate: method.rate, freeAbove: method.freeAbove },
    paymentMethod: opts.paymentMethod ?? null,
    codFee: settings.payments.codFee,
    pricesIncludeTax: settings.tax.pricesIncludeTax,
    shippingGstRate: settings.tax.shippingGstRate,
    storeStateCode: stateCode(settings.store.state),
    destinationStateCode: opts.state ? stateCode(opts.state) : null,
  });
  if (totals.coupon && !totals.coupon.applied) couponError = totals.coupon.message;
  return {
    ownerKey,
    lines: active,
    saved,
    itemCount: active.reduce((s, l) => s + l.quantity, 0),
    couponCode: code ?? null,
    couponError,
    totals,
    hasIssues: active.some((l) => !!l.issue),
    shippingMethodId: method.id,
  };
}

type VariantForCart = { id: string; stock: number; track_inventory: boolean; is_active: boolean; product: { status: string; publish_at: string | null; customization: unknown; name: string } | null };

async function loadVariant(variantId: string): Promise<VariantForCart> {
  const { data } = await db()
    .from("shop_variants")
    .select("id, stock, track_inventory, is_active, product:shop_products (status, publish_at, customization, name)")
    .eq("id", variantId)
    .maybeSingle();
  const v = data as unknown as VariantForCart | null;
  if (!v || !v.is_active || !v.product || v.product.status !== "active" || (v.product.publish_at && new Date(v.product.publish_at) > new Date()))
    throw new ShopError("This product is no longer available.", 404, "unavailable");
  return v;
}

export async function addToCart(variantId: string, quantity: number, customization: unknown) {
  const v = await loadVariant(variantId);
  const custom = resolveCustomization(parseCustomizationOptions(v.product!.customization), customization);
  if (!custom.ok) throw new ShopError(custom.error, 422, "customization");
  const ownerKey = (await getOwnerKey(true))!;
  const id = (await cartId(ownerKey, true))!;

  const { data: existing } = await db()
    .from("shop_cart_items")
    .select("id, quantity")
    .eq("cart_id", id)
    .eq("variant_id", variantId)
    .eq("customization_key", custom.key)
    .maybeSingle();
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > MAX_LINE_QTY) throw new ShopError(`You can add up to ${MAX_LINE_QTY} of an item. For bigger quantities, request a bulk quote.`, 422, "max_qty");
  if (v.track_inventory && next > v.stock)
    throw new ShopError(v.stock <= 0 ? "Sorry, this is out of stock." : `Only ${v.stock} available${existing ? ` (you already have ${existing.quantity} in your cart)` : ""}.`, 409, "stock");

  if (existing) must(await db().from("shop_cart_items").update({ quantity: next, saved_for_later: false }).eq("id", existing.id), "update cart");
  else must(await db().from("shop_cart_items").insert({ cart_id: id, variant_id: variantId, quantity, customization: custom.value, customization_key: custom.key }), "add to cart");
  await db().from("shop_carts").update({ updated_at: new Date().toISOString() }).eq("id", id);
}

async function ownedItem(itemId: string) {
  const ownerKey = await getOwnerKey(false);
  if (!ownerKey) throw new ShopError("Your cart is empty.", 404);
  const id = await cartId(ownerKey, false);
  const { data } = id ? await db().from("shop_cart_items").select("id, variant_id, quantity").eq("id", itemId).eq("cart_id", id).maybeSingle() : { data: null };
  if (!data) throw new ShopError("That item is no longer in your cart.", 404);
  return data;
}

export async function updateCartItem(itemId: string, quantity: number) {
  const item = await ownedItem(itemId);
  if (quantity <= 0) {
    await db().from("shop_cart_items").delete().eq("id", item.id);
    return;
  }
  if (quantity > MAX_LINE_QTY) throw new ShopError(`You can add up to ${MAX_LINE_QTY} of an item.`, 422);
  const v = await loadVariant(item.variant_id).catch(() => null);
  if (v?.track_inventory && quantity > v.stock) throw new ShopError(v.stock <= 0 ? "Sorry, this is out of stock." : `Only ${v.stock} available.`, 409, "stock");
  must(await db().from("shop_cart_items").update({ quantity }).eq("id", item.id), "update cart");
}

export async function setSavedForLater(itemId: string, saved: boolean) {
  const item = await ownedItem(itemId);
  must(await db().from("shop_cart_items").update({ saved_for_later: saved }).eq("id", item.id), "save for later");
}

export async function setCartCoupon(code: string | null) {
  const ownerKey = await getOwnerKey(true);
  const id = (await cartId(ownerKey!, true))!;
  if (code) {
    const customer = await getCustomer();
    const r = await resolveCoupon(code, { email: customer?.email, customerId: customer?.id });
    if (!r.ok) throw new ShopError(r.error, 422, "coupon");
    code = r.rule.code;
  }
  must(await db().from("shop_carts").update({ coupon_code: code }).eq("id", id), "coupon");
}

export async function clearCart(ownerKey: string) {
  const id = await cartId(ownerKey, false);
  if (!id) return;
  await db().from("shop_cart_items").delete().eq("cart_id", id).eq("saved_for_later", false);
  await db().from("shop_carts").update({ coupon_code: null }).eq("id", id);
}

/** After sign-in: move the guest cart and wishlist into the customer's account, then forget the guest cookie. */
export async function mergeGuestIntoCustomer(customerId: string) {
  const guestKey = await guestOwnerKey();
  if (!guestKey) return;
  const target = `c:${customerId}`;
  const guest = await loadCartLines(guestKey);
  if (guest.id && guest.lines.length) {
    const toId = (await cartId(target, true))!;
    const { data: mine } = await db().from("shop_cart_items").select("id, variant_id, customization_key, quantity").eq("cart_id", toId);
    const { data: rawGuest } = await db().from("shop_cart_items").select("variant_id, customization, customization_key, quantity, saved_for_later").eq("cart_id", guest.id);
    for (const g of rawGuest ?? []) {
      const match = (mine ?? []).find((m) => m.variant_id === g.variant_id && m.customization_key === g.customization_key);
      if (match) await db().from("shop_cart_items").update({ quantity: Math.min(MAX_LINE_QTY, Math.max(match.quantity, g.quantity)) }).eq("id", match.id);
      else await db().from("shop_cart_items").insert({ cart_id: toId, ...g });
    }
    if (guest.couponCode) await db().from("shop_carts").update({ coupon_code: guest.couponCode }).eq("id", toId).is("coupon_code", null);
    await db().from("shop_carts").delete().eq("id", guest.id);
  }
  const { data: wish } = await db().from("shop_wishlist_items").select("product_id").eq("owner_key", guestKey);
  if (wish?.length) {
    await db().from("shop_wishlist_items").upsert(wish.map((w) => ({ owner_key: target, product_id: w.product_id })), { onConflict: "owner_key,product_id", ignoreDuplicates: true });
    await db().from("shop_wishlist_items").delete().eq("owner_key", guestKey);
  }
  (await cookies()).set(GUEST_COOKIE, "", { path: "/", maxAge: 0, domain: shopEnv.cookieDomain });
}

/** Lightweight count for the header badge. */
export async function cartCount(): Promise<number> {
  if (!shopConfigured()) return 0;
  const ownerKey = await getOwnerKey(false);
  if (!ownerKey) return 0;
  const id = await cartId(ownerKey, false);
  if (!id) return 0;
  const { data } = await db().from("shop_cart_items").select("quantity").eq("cart_id", id).eq("saved_for_later", false);
  return (data ?? []).reduce((s, r) => s + r.quantity, 0);
}
