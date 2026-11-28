"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SHOP_ROUTE } from "@/shop/config";
import { slugify } from "@/shop/lib/slug";
import { ORDER_STATUSES } from "@/shop/lib/order-status";
import { emailSchema } from "@/shop/lib/validation";
import { settingsSchemas, type SettingsSection } from "@/shop/lib/settings-schema";
import { createAdmin, createAdminResetToken, ROLES } from "../auth/admin";
import { randomToken } from "../auth/crypto";
import { db, must, ShopError } from "../db";
import { shopIntegrations } from "../env";
import { sendPasswordReset } from "../notifications";
import { addEvent, cancelOrder, getOrderById, refundOrder, updateOrderStatus, upsertShipment } from "../orders";
import { saveSettings, getSettings } from "../settings";
import { shiprocket } from "../shipping";
import { adminAction, revalidateStore } from "./action";
import { deleteOrArchiveProduct, importProductsCsv, saveProduct } from "./products";

const uuid = z.uuid();
const revalidateAdmin = () => revalidatePath(`${SHOP_ROUTE}/admin`, "layout");

// ── Products ─────────────────────────────────────────────────────────────
export async function saveProductAction(input: unknown) {
  return adminAction("products", "product.save", async (admin) => {
    const r = await saveProduct(input, admin.id);
    revalidateStore();
    return { message: "Product saved.", data: r, entity: "product", entityId: r.id };
  });
}

export async function deleteProductAction(id: string) {
  return adminAction("products", "product.delete", async () => {
    const r = await deleteOrArchiveProduct(uuid.parse(id));
    revalidateStore();
    return { message: r === "archived" ? "Product has orders, so it was archived instead of deleted." : "Product deleted.", entity: "product", entityId: id };
  });
}

export async function bulkProductStatusAction(ids: string[], status: "draft" | "active" | "archived") {
  return adminAction("products", "product.bulk_status", async () => {
    const list = z.array(uuid).max(200).parse(ids);
    must(await db().from("shop_products").update({ status: z.enum(["draft", "active", "archived"]).parse(status) }).in("id", list), "bulk status");
    revalidateStore();
    return { message: `${list.length} product(s) updated.`, details: { ids: list, status } };
  });
}

export async function importProductsAction(form: FormData) {
  return adminAction("products", "product.import", async (admin) => {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new ShopError("Choose a CSV file.", 422);
    if (file.size > 5 * 1024 * 1024) throw new ShopError("The file is larger than 5 MB.", 422);
    const r = await importProductsCsv(await file.text(), admin.id);
    revalidateStore();
    return { message: `Imported ${r.products} product(s) and ${r.variants} variant(s).${r.errors.length ? ` ${r.errors.length} row(s) had problems.` : ""}`, data: r, details: { products: r.products, variants: r.variants, errors: r.errors.length } };
  });
}

// ── Categories, collections, homepage content ────────────────────────────
const categorySchema = z.object({
  id: uuid.optional().nullable(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  parentId: uuid.nullable().optional().or(z.literal("")).transform((v) => v || null),
  imageUrl: z.url().nullable().optional().or(z.literal("")).transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
  isActive: z.boolean().default(true),
});

export async function saveCategoryAction(input: unknown) {
  return adminAction("products", "category.save", async () => {
    const c = categorySchema.parse(input);
    if (c.id && c.parentId === c.id) throw new ShopError("A category can't be its own parent.", 422);
    const row = { name: c.name, slug: slugify(c.slug || c.name), description: c.description || null, parent_id: c.parentId, image_url: c.imageUrl, sort_order: c.sortOrder, is_active: c.isActive };
    const res = c.id ? await db().from("shop_categories").update(row).eq("id", c.id) : await db().from("shop_categories").insert(row);
    if (res.error?.code === "23505") throw new ShopError("That slug is already used.", 409, "slug", { slug: "Already used" });
    must(res, "category");
    revalidateStore();
    revalidateAdmin();
    return { message: "Category saved.", entity: "category", entityId: c.id ?? row.slug };
  });
}

export async function deleteCategoryAction(id: string) {
  return adminAction("products", "category.delete", async () => {
    must(await db().from("shop_categories").delete().eq("id", uuid.parse(id)), "delete category");
    revalidateStore();
    revalidateAdmin();
    return { message: "Category deleted. Its products are now uncategorised.", entity: "category", entityId: id };
  });
}

const dateOrNull = z.string().nullable().optional().transform((v) => (v ? new Date(v).toISOString() : null));

export async function saveCollectionAction(input: unknown) {
  return adminAction("content", "collection.save", async () => {
    const c = z
      .object({ id: uuid.optional().nullable(), name: z.string().trim().min(2).max(80), slug: z.string().trim().max(80).optional(), description: z.string().trim().max(1000).optional().nullable(), imageUrl: z.url().nullable().optional().or(z.literal("")).transform((v) => v || null), isFeatured: z.boolean(), isSeasonal: z.boolean(), isActive: z.boolean(), startsAt: dateOrNull, endsAt: dateOrNull, sortOrder: z.coerce.number().int().min(0).max(10000).default(100), productIds: z.array(uuid).max(200).default([]) })
      .parse(input);
    const row = { name: c.name, slug: slugify(c.slug || c.name), description: c.description || null, image_url: c.imageUrl, is_featured: c.isFeatured, is_seasonal: c.isSeasonal, is_active: c.isActive, starts_at: c.startsAt, ends_at: c.endsAt, sort_order: c.sortOrder };
    const res = c.id ? await db().from("shop_collections").update(row).eq("id", c.id).select("id").single() : await db().from("shop_collections").insert(row).select("id").single();
    if (res.error?.code === "23505") throw new ShopError("That slug is already used.", 409);
    const id = must(res, "collection").id;
    await db().from("shop_collection_products").delete().eq("collection_id", id);
    if (c.productIds.length) await db().from("shop_collection_products").insert(c.productIds.map((p, n) => ({ collection_id: id, product_id: p, sort_order: n })));
    revalidateStore();
    revalidateAdmin();
    return { message: "Collection saved.", entity: "collection", entityId: id };
  });
}

export async function deleteCollectionAction(id: string) {
  return adminAction("content", "collection.delete", async () => {
    must(await db().from("shop_collections").delete().eq("id", uuid.parse(id)), "delete collection");
    revalidateStore();
    revalidateAdmin();
    return { message: "Collection deleted.", entity: "collection", entityId: id };
  });
}

export async function saveBannerAction(input: unknown) {
  return adminAction("content", "banner.save", async () => {
    const b = z
      .object({
        id: uuid.optional().nullable(),
        placement: z.enum(["hero", "promo", "strip"]),
        title: z.string().trim().min(2).max(140),
        subtitle: z.string().trim().max(300).optional().nullable(),
        ctaLabel: z.string().trim().max(40).optional().nullable(),
        ctaUrl: z.string().trim().max(300).optional().nullable().refine((u) => !u || u.startsWith("/") || /^https:\/\//.test(u), "Use a path like /products or an https:// link"),
        imageUrl: z.url().nullable().optional().or(z.literal("")).transform((v) => v || null),
        theme: z.enum(["dark", "light", "accent"]),
        isActive: z.boolean(),
        startsAt: dateOrNull,
        endsAt: dateOrNull,
        sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
      })
      .parse(input);
    const row = { placement: b.placement, title: b.title, subtitle: b.subtitle || null, cta_label: b.ctaLabel || null, cta_url: b.ctaUrl || null, image_url: b.imageUrl, theme: b.theme, is_active: b.isActive, starts_at: b.startsAt, ends_at: b.endsAt, sort_order: b.sortOrder };
    must(b.id ? await db().from("shop_banners").update(row).eq("id", b.id) : await db().from("shop_banners").insert(row), "banner");
    revalidateStore();
    revalidateAdmin();
    return { message: "Banner saved.", entity: "banner", entityId: b.id ?? undefined };
  });
}

export async function deleteBannerAction(id: string) {
  return adminAction("content", "banner.delete", async () => {
    must(await db().from("shop_banners").delete().eq("id", uuid.parse(id)), "delete banner");
    revalidateStore();
    revalidateAdmin();
    return { message: "Banner deleted.", entity: "banner", entityId: id };
  });
}

// ── Settings ─────────────────────────────────────────────────────────────
export async function saveSettingsAction(section: SettingsSection, value: unknown) {
  const perm = section === "homepage" ? "content" : "settings";
  return adminAction(perm, `settings.${section}`, async () => {
    if (!(section in settingsSchemas)) throw new ShopError("Unknown settings section.", 400);
    const saved = await saveSettings(section, value);
    revalidateStore();
    revalidateAdmin();
    return { message: "Settings saved.", entity: "settings", entityId: section, details: saved };
  });
}

// ── Orders ───────────────────────────────────────────────────────────────
export async function orderStatusAction(orderId: string, status: string, note?: string) {
  return adminAction("orders", "order.status", async (admin) => {
    const s = z.enum(ORDER_STATUSES).parse(status);
    await updateOrderStatus(uuid.parse(orderId), s, `admin:${admin.fullName}`, note?.slice(0, 500) || null);
    revalidateAdmin();
    return { message: "Order updated.", entity: "order", entityId: orderId, details: { status: s } };
  });
}

export async function shipmentAction(orderId: string, input: unknown) {
  return adminAction("orders", "order.shipment", async (admin) => {
    const s = z
      .object({
        id: uuid.optional().nullable(),
        carrier: z.string().trim().max(60).nullable().optional().transform((v) => v || null),
        trackingNumber: z.string().trim().max(60).nullable().optional().transform((v) => v || null),
        trackingUrl: z.url().nullable().optional().or(z.literal("")).transform((v) => v || null),
        status: z.enum(["pending", "packed", "shipped", "in_transit", "out_for_delivery", "delivered", "returned", "cancelled"]),
        markOrderShipped: z.boolean().default(false),
      })
      .parse(input);
    const id = uuid.parse(orderId);
    await upsertShipment(id, s, `admin:${admin.fullName}`);
    if (s.markOrderShipped) {
      const o = await getOrderById(id);
      if (o && ["payment_confirmed", "processing", "ready_for_shipment"].includes(o.status)) await updateOrderStatus(id, "shipped", `admin:${admin.fullName}`, null);
    }
    revalidateAdmin();
    return { message: s.markOrderShipped ? "Shipment saved and customer notified." : "Shipment saved.", entity: "order", entityId: orderId };
  });
}

export async function shiprocketShipmentAction(orderId: string) {
  return adminAction("orders", "order.shiprocket", async (admin) => {
    if (!shopIntegrations.shiprocket) throw new ShopError("Shiprocket isn't configured (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).", 400);
    const o = await getOrderById(uuid.parse(orderId));
    if (!o) throw new ShopError("Order not found.", 404);
    const weightKg = Math.max(0.1, o.items.reduce((s, i) => s + i.quantity * 0.25, 0));
    const r = await shiprocket.createShipment({
      orderNumber: o.order_number, createdAt: o.created_at, paymentMethod: o.payment_method, grandTotal: o.grand_total, address: o.shipping_address, email: o.email,
      items: o.items.map((i) => ({ name: i.product_name, sku: i.sku, quantity: i.quantity, unitPrice: i.unit_price, hsn: i.hsn_code })), weightKg, dimsCm: { l: 20, b: 15, h: 10 },
    });
    await upsertShipment(o.id, { carrier: r.carrier, trackingNumber: r.trackingNumber, trackingUrl: r.trackingNumber ? `https://shiprocket.co/tracking/${r.trackingNumber}` : null, status: "packed", provider: "shiprocket", providerRef: r.providerRef }, `admin:${admin.fullName}`);
    revalidateAdmin();
    return { message: `Shiprocket shipment created${r.trackingNumber ? ` (AWB ${r.trackingNumber})` : ""}.`, entity: "order", entityId: orderId };
  });
}

export async function refundAction(orderId: string, input: unknown) {
  return adminAction("refunds", "order.refund", async (admin) => {
    const r = z.object({ amount: z.coerce.number().positive().max(10_000_000), reason: z.string().trim().min(3).max(300), restock: z.boolean().default(false) }).parse(input);
    const res = await refundOrder(uuid.parse(orderId), { amount: r.amount, reason: r.reason, actor: `admin:${admin.fullName}`, adminId: admin.id, restock: r.restock });
    revalidateAdmin();
    return { message: res.status === "manual" ? `Refund of ₹${res.amount} recorded. Transfer it manually (COD / no gateway payment).` : `Refund of ₹${res.amount} sent to Razorpay (${res.status}).`, entity: "order", entityId: orderId, details: r };
  });
}

export async function cancelOrderAction(orderId: string, input: unknown) {
  return adminAction("orders", "order.cancel", async (admin) => {
    const c = z.object({ reason: z.string().trim().min(3).max(300), refund: z.boolean().default(true), restock: z.boolean().default(true) }).parse(input);
    await cancelOrder(uuid.parse(orderId), { actor: `admin:${admin.fullName}`, reason: c.reason, refund: c.refund, restock: c.restock });
    revalidateAdmin();
    return { message: "Order cancelled.", entity: "order", entityId: orderId, details: c };
  });
}

export async function generateInvoiceAction(orderId: string) {
  return adminAction("orders", "order.invoice", async () => {
    const o = await getOrderById(uuid.parse(orderId));
    if (!o) throw new ShopError("Order not found.", 404);
    if (!["paid", "cod_pending", "partially_refunded"].includes(o.payment_status)) throw new ShopError("Invoices are issued for paid or confirmed COD orders.", 409);
    const settings = await getSettings();
    const { data } = await db().rpc("shop_assign_invoice_number", { p_order_id: o.id, p_prefix: settings.store.invoicePrefix });
    revalidateAdmin();
    return { message: `Invoice ${data} generated.`, entity: "order", entityId: orderId };
  });
}

export async function orderNoteAction(orderId: string, note: string, visibleToCustomer: boolean) {
  return adminAction("orders", "order.note", async (admin) => {
    const text = z.string().trim().min(1).max(1000).parse(note);
    await addEvent(uuid.parse(orderId), { note: text, actor: `admin:${admin.fullName}`, visible: visibleToCustomer });
    revalidateAdmin();
    return { message: "Note added.", entity: "order", entityId: orderId };
  });
}

export async function clearReviewFlagAction(orderId: string) {
  return adminAction("orders", "order.review_cleared", async () => {
    must(await db().from("shop_orders").update({ needs_review: false }).eq("id", uuid.parse(orderId)), "clear flag");
    revalidateAdmin();
    return { message: "Marked as reviewed.", entity: "order", entityId: orderId };
  });
}

// ── Customers ────────────────────────────────────────────────────────────
export async function customerStatusAction(customerId: string, status: "active" | "suspended") {
  return adminAction("customers", "customer.status", async () => {
    const id = uuid.parse(customerId);
    must(await db().from("shop_customers").update({ status: z.enum(["active", "suspended"]).parse(status) }).eq("id", id).neq("status", "deleted"), "status");
    if (status === "suspended") await db().from("shop_customer_sessions").delete().eq("customer_id", id);
    revalidateAdmin();
    return { message: status === "suspended" ? "Account suspended and signed out." : "Account re-activated.", entity: "customer", entityId: id };
  });
}

export async function customerNotesAction(customerId: string, notes: string) {
  return adminAction("customers", "customer.notes", async () => {
    must(await db().from("shop_customers").update({ admin_notes: z.string().max(4000).parse(notes) || null }).eq("id", uuid.parse(customerId)), "notes");
    revalidateAdmin();
    return { message: "Notes saved.", entity: "customer", entityId: customerId };
  });
}

/** Completes a deletion request: personal data is erased, orders are kept (anonymised profile link) for GST records. */
export async function processDeletionAction(customerId: string) {
  return adminAction("customers", "customer.delete", async () => {
    const id = uuid.parse(customerId);
    await Promise.all([
      db().from("shop_customer_sessions").delete().eq("customer_id", id),
      db().from("shop_addresses").delete().eq("customer_id", id),
      db().from("shop_wishlist_items").delete().eq("owner_key", `c:${id}`),
      db().from("shop_carts").delete().eq("owner_key", `c:${id}`),
      db().from("shop_reviews").update({ author_name: "Former customer", customer_id: null }).eq("customer_id", id),
    ]);
    must(
      await db().from("shop_customers").update({ status: "deleted", email: `deleted-${id}@invalid.local`, full_name: "Deleted customer", phone: null, password_hash: `disabled$${randomToken()}`, marketing_opt_in: false, admin_notes: null }).eq("id", id),
      "delete customer",
    );
    revalidateAdmin();
    return { message: "Customer data erased. Orders were kept for tax records.", entity: "customer", entityId: id };
  });
}

// ── Inventory ────────────────────────────────────────────────────────────
export async function adjustStockAction(input: unknown) {
  return adminAction("inventory", "inventory.adjust", async (admin) => {
    const a = z.object({ variantId: uuid, mode: z.enum(["add", "remove", "set"]), quantity: z.coerce.number().int().min(0).max(1_000_000), reason: z.enum(["adjustment", "restock"]), note: z.string().trim().max(300).optional() }).parse(input);
    const { data: v } = await db().from("shop_variants").select("stock").eq("id", a.variantId).single();
    if (!v) throw new ShopError("Variant not found.", 404);
    const delta = a.mode === "add" ? a.quantity : a.mode === "remove" ? -a.quantity : a.quantity - v.stock;
    if (delta === 0) return { message: "No change." };
    const res = await db().rpc("shop_adjust_stock", { p_variant_id: a.variantId, p_delta: delta, p_reason: a.reason, p_note: a.note || null, p_admin_id: admin.id });
    if (res.error) throw new ShopError(/NEGATIVE|stock_check/.test(res.error.message) ? "Stock can't go below zero." : "Couldn't adjust stock.", 409);
    revalidateStore();
    revalidateAdmin();
    return { message: `Stock is now ${res.data}.`, entity: "variant", entityId: a.variantId, details: { delta } };
  });
}

// ── Discounts ────────────────────────────────────────────────────────────
export async function saveCouponAction(input: unknown) {
  return adminAction("discounts", "coupon.save", async () => {
    const c = z
      .object({
        id: uuid.optional().nullable(),
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, "3–40 letters, numbers, - or _"),
        description: z.string().trim().max(200).optional().nullable(),
        type: z.enum(["percent", "fixed", "free_shipping"]),
        value: z.coerce.number().min(0).max(1_000_000),
        maxDiscount: z.union([z.literal(""), z.null(), z.coerce.number().min(0)]).transform((v) => (v === "" || v == null ? null : Number(v))),
        minOrderValue: z.coerce.number().min(0).default(0),
        appliesTo: z.enum(["all", "products", "categories"]),
        productIds: z.array(uuid).max(200).default([]),
        categoryIds: z.array(uuid).max(100).default([]),
        startsAt: dateOrNull,
        endsAt: dateOrNull,
        usageLimit: z.union([z.literal(""), z.null(), z.coerce.number().int().min(1)]).transform((v) => (v === "" || v == null ? null : Number(v))),
        perCustomerLimit: z.union([z.literal(""), z.null(), z.coerce.number().int().min(1)]).transform((v) => (v === "" || v == null ? null : Number(v))),
        firstOrderOnly: z.boolean(),
        freeShipping: z.boolean(),
        isActive: z.boolean(),
      })
      .superRefine((c, ctx) => {
        if (c.type === "percent" && (c.value <= 0 || c.value > 100)) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage must be between 1 and 100" });
        if (c.type === "fixed" && c.value <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the discount amount" });
        if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start" });
      })
      .parse(input);
    const row = {
      code: c.code, description: c.description || null, type: c.type, value: c.type === "free_shipping" ? 0 : c.value, max_discount: c.maxDiscount, min_order_value: c.minOrderValue,
      applies_to: c.appliesTo, product_ids: c.appliesTo === "products" ? c.productIds : [], category_ids: c.appliesTo === "categories" ? c.categoryIds : [],
      starts_at: c.startsAt, ends_at: c.endsAt, usage_limit: c.usageLimit, per_customer_limit: c.perCustomerLimit, first_order_only: c.firstOrderOnly, free_shipping: c.freeShipping, is_active: c.isActive,
    };
    const res = c.id ? await db().from("shop_coupons").update(row).eq("id", c.id) : await db().from("shop_coupons").insert(row);
    if (res.error?.code === "23505") throw new ShopError("That code already exists.", 409, "code", { code: "Already exists" });
    must(res, "coupon");
    revalidateAdmin();
    return { message: "Discount saved.", entity: "coupon", entityId: c.code };
  });
}

export async function deleteCouponAction(id: string) {
  return adminAction("discounts", "coupon.delete", async () => {
    const { count } = await db().from("shop_coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", uuid.parse(id));
    if ((count ?? 0) > 0) must(await db().from("shop_coupons").update({ is_active: false }).eq("id", id), "coupon");
    else must(await db().from("shop_coupons").delete().eq("id", id), "coupon");
    revalidateAdmin();
    return { message: (count ?? 0) > 0 ? "This code has been used, so it was deactivated instead of deleted." : "Discount deleted.", entity: "coupon", entityId: id };
  });
}

// ── Reviews ──────────────────────────────────────────────────────────────
export async function moderateReviewAction(id: string, status: "approved" | "rejected" | "pending") {
  return adminAction("reviews", "review.moderate", async () => {
    const { data } = await db().from("shop_reviews").update({ status: z.enum(["approved", "rejected", "pending"]).parse(status) }).eq("id", uuid.parse(id)).select("product_id").single();
    if (data) {
      const { data: all } = await db().from("shop_reviews").select("rating").eq("product_id", data.product_id).eq("status", "approved");
      const n = all?.length ?? 0;
      const avg = n ? (all ?? []).reduce((s, r) => s + r.rating, 0) / n : 0;
      await db().from("shop_products").update({ rating_avg: Math.round(avg * 100) / 100, rating_count: n }).eq("id", data.product_id);
    }
    revalidateStore();
    revalidateAdmin();
    return { message: `Review ${status}.`, entity: "review", entityId: id };
  });
}

// ── Team ─────────────────────────────────────────────────────────────────
export async function inviteAdminAction(input: unknown) {
  return adminAction("team", "team.invite", async () => {
    const a = z.object({ email: emailSchema, fullName: z.string().trim().min(2).max(120), role: z.enum(ROLES) }).parse(input);
    await createAdmin({ ...a, password: randomToken(24) }); // random password; they set their own via the emailed link
    const t = await createAdminResetToken(a.email);
    if (t) await sendPasswordReset({ email: a.email, fullName: a.fullName }, t.token, "admin");
    revalidateAdmin();
    return { message: `Invitation sent to ${a.email}. The link is valid for 1 hour (they can use "Forgot password" later).`, entity: "admin", entityId: a.email };
  });
}

export async function updateAdminAction(id: string, input: unknown) {
  return adminAction("team", "team.update", async (me) => {
    const a = z.object({ role: z.enum(ROLES), status: z.enum(["active", "disabled"]) }).parse(input);
    const target = uuid.parse(id);
    if (target === me.id && (a.role !== "owner" || a.status !== "active")) throw new ShopError("You can't demote or disable your own account.", 409);
    if (a.role !== "owner" || a.status !== "active") {
      const { count } = await db().from("shop_admins").select("id", { count: "exact", head: true }).eq("role", "owner").eq("status", "active").neq("id", target);
      if ((count ?? 0) === 0) throw new ShopError("Keep at least one active owner.", 409);
    }
    must(await db().from("shop_admins").update(a).eq("id", target), "update admin");
    if (a.status === "disabled") await db().from("shop_admin_sessions").delete().eq("admin_id", target);
    revalidateAdmin();
    return { message: "Team member updated.", entity: "admin", entityId: target, details: a };
  });
}

export async function revokeAdminSessionsAction(id: string) {
  return adminAction("team", "team.revoke_sessions", async (me) => {
    const target = uuid.parse(id);
    let q = db().from("shop_admin_sessions").delete().eq("admin_id", target);
    if (target === me.id) q = q.neq("id", me.sessionId);
    await q;
    return { message: "Sessions signed out.", entity: "admin", entityId: target };
  });
}
