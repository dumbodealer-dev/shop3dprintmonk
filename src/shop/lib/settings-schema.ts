import { z } from "zod";

/**
 * Store settings, editable in /admin/settings and stored in the shop_settings table
 * (one row per section). Every field has a default so the shop works before
 * anything is configured. Shared by server and the admin form.
 */
const str = (d = "") => z.string().trim().max(2000).default(d);

export const storeSettingsSchema = z.object({
  name: str("3D PRINTMONK Shop"),
  legalName: str(""),
  logoUrl: z.string().trim().max(1000).nullable().default(null).refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), "Use an https:// link"),
  email: str(""),
  supportEmail: str(""),
  phone: str(""),
  whatsapp: str(""),
  addressLine: str(""),
  city: str("New Delhi"),
  state: str("Delhi"),
  pincode: str(""),
  gstin: str(""),
  pan: str(""),
  invoicePrefix: z.string().trim().regex(/^[A-Z0-9-]{1,10}$/).default("PM"),
  instagram: str(""),
  currency: z.literal("INR").default("INR"),
});

export const taxSettingsSchema = z.object({
  /** Indian retail norm: listed prices already include GST. */
  pricesIncludeTax: z.boolean().default(true),
  /** Used when a product has no GST rate of its own. */
  defaultGstRate: z.number().min(0).max(28).default(18),
  /** GST charged on shipping & COD fees (follows the main supply; 18% is a safe default). */
  shippingGstRate: z.number().min(0).max(28).default(18),
  /** Show a GST breakdown and collect GSTIN at checkout. */
  enableGstInvoice: z.boolean().default(true),
});

export const shippingMethodSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,30}$/),
  label: z.string().min(1).max(60),
  rate: z.number().min(0).max(100000),
  /** Order value (after discounts) at or above which this method is free. null = never free. */
  freeAbove: z.number().min(0).nullable().default(null),
  minDays: z.number().int().min(0).max(60),
  maxDays: z.number().int().min(0).max(90),
  enabled: z.boolean().default(true),
});

export const shippingSettingsSchema = z.object({
  methods: z.array(shippingMethodSchema).min(1).default([
    { id: "standard", label: "Standard delivery", rate: 79, freeAbove: 999, minDays: 4, maxDays: 7, enabled: true },
    { id: "express", label: "Express delivery", rate: 179, freeAbove: null, minDays: 2, maxDays: 3, enabled: true },
  ]),
  /** Days to print & pack before dispatch (added to delivery estimates; products can add lead time). */
  processingDays: z.number().int().min(0).max(30).default(1),
  /** Empty = deliver anywhere in India. Otherwise PIN codes must start with one of these prefixes. */
  serviceablePrefixes: z.array(z.string().regex(/^\d{1,6}$/)).default([]),
  blockedPincodes: z.array(z.string().regex(/^\d{6}$/)).default([]),
  /** PIN prefixes treated as "local" (faster estimate), e.g. Delhi NCR. */
  localPrefixes: z.array(z.string().regex(/^\d{1,6}$/)).default(["110", "120", "121", "122", "201"]),
  localMaxDays: z.number().int().min(0).max(30).default(3),
  provider: z.enum(["manual", "shiprocket"]).default("manual"),
});

export const paymentSettingsSchema = z.object({
  razorpayEnabled: z.boolean().default(true),
  codEnabled: z.boolean().default(true),
  codFee: z.number().min(0).max(10000).default(49),
  codMaxOrderValue: z.number().min(0).default(5000),
  /** Minutes an unpaid online order holds its stock before it is released. */
  pendingPaymentMinutes: z.number().int().min(10).max(1440).default(45),
});

export const policySettingsSchema = z.object({
  returns: str(
    "Products that arrive damaged or defective can be returned within 7 days of delivery. Email us a photo of the item and packaging with your order number and we will arrange a replacement or refund.\n\nPersonalised and made-to-order items cannot be returned unless they arrive damaged or differ from the order.",
  ),
  shipping: str(
    "Orders are printed, checked and dispatched from New Delhi, usually within 1–3 working days. Delivery across India typically takes 3–7 working days after dispatch. Tracking details are emailed when your order ships.",
  ),
  terms: str("By placing an order you agree to these terms. Prices are in Indian Rupees (INR) and include GST unless stated. Colours of 3D printed products may vary slightly between batches, and small layer lines are a natural part of the process."),
  privacy: str("We use your details only to process and deliver your order, provide support and, if you opt in, send updates. Payments are processed securely by our payment partner — we never see or store your card details."),
});

export const notificationSettingsSchema = z.object({
  /** Team inboxes for new-order alerts. Empty = BUSINESS_NOTIFICATION_EMAIL from the environment. */
  adminEmails: z.array(z.email()).default([]),
  notifyOnNewOrder: z.boolean().default(true),
  notifyOnLowStock: z.boolean().default(true),
  customerEmails: z.boolean().default(true),
});

export const homepageSettingsSchema = z.object({
  showCategories: z.boolean().default(true),
  showFeatured: z.boolean().default(true),
  showBestsellers: z.boolean().default(true),
  showNewArrivals: z.boolean().default(true),
  showCollections: z.boolean().default(true),
  showPromos: z.boolean().default(true),
  showNewsletter: z.boolean().default(true),
  newsletterTitle: str("Get new drops first"),
  newsletterText: str("New designs, limited colours and members-only offers. No spam — unsubscribe anytime."),
  featuredTitle: str("Featured products"),
});

export const settingsSchemas = {
  store: storeSettingsSchema,
  tax: taxSettingsSchema,
  shipping: shippingSettingsSchema,
  payments: paymentSettingsSchema,
  policies: policySettingsSchema,
  notifications: notificationSettingsSchema,
  homepage: homepageSettingsSchema,
} as const;

export type SettingsSection = keyof typeof settingsSchemas;
export type ShopSettings = { [K in SettingsSection]: z.infer<(typeof settingsSchemas)[K]> };
export type ShippingMethod = z.infer<typeof shippingMethodSchema>;

export function defaultSettings(): ShopSettings {
  return Object.fromEntries(Object.entries(settingsSchemas).map(([k, s]) => [k, s.parse({})])) as ShopSettings;
}

export const POLICY_PAGES = {
  "returns-refunds": { key: "returns", title: "Returns & Refunds" },
  shipping: { key: "shipping", title: "Shipping Policy" },
  terms: { key: "terms", title: "Terms & Conditions" },
  privacy: { key: "privacy", title: "Privacy Policy" },
} as const;
export type PolicySlug = keyof typeof POLICY_PAGES;
