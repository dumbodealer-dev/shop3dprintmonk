import { z } from "zod";
import { PINCODE_RE, STATE_NAMES, isValidGstin, normalizeIndianMobile } from "./india";

/** Shared by browser forms (instant feedback) and API routes (authoritative). */

const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max, `Please keep this under ${max} characters`);
const optional = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const mobileSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIndianMobile(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number" });
    return n ?? v;
  });

export const emailSchema = z.email("Enter a valid email address").max(200).transform((v) => v.trim().toLowerCase());

export const addressSchema = z.object({
  fullName: text(2, 120, "Enter the recipient's name"),
  phone: mobileSchema,
  line1: text(3, 200, "Enter house / flat number and street"),
  line2: optional(200),
  landmark: optional(120),
  city: text(2, 80, "Enter the city"),
  state: z.enum(STATE_NAMES, { error: "Choose a state" }),
  pincode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
  country: z.literal("IN").default("IN"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const savedAddressSchema = addressSchema.extend({
  label: optional(40),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => !v || isValidGstin(v), "This GSTIN doesn't look valid — check the 15 characters");

export const checkoutSchema = z
  .object({
    idempotencyKey: z.uuid(),
    contact: z.object({ email: emailSchema, phone: mobileSchema, fullName: text(2, 120, "Enter your name") }),
    shippingAddress: addressSchema,
    billingSameAsShipping: z.boolean().default(true),
    billingAddress: addressSchema.optional().nullable(),
    gstin: gstinSchema,
    businessName: optional(160),
    shippingMethod: z.string().regex(/^[a-z0-9_-]{1,30}$/),
    paymentMethod: z.enum(["razorpay", "cod"]),
    couponCode: optional(40),
    notes: optional(1000),
    createAccount: z.boolean().default(false),
    password: z.string().max(200).optional().nullable(),
    marketingOptIn: z.boolean().default(false),
    acceptTerms: z.literal(true, { error: "Please accept the terms to place your order" }),
  })
  .superRefine((d, ctx) => {
    if (!d.billingSameAsShipping && !d.billingAddress) ctx.addIssue({ code: "custom", path: ["billingAddress"], message: "Enter a billing address" });
    if (d.gstin && !d.businessName) ctx.addIssue({ code: "custom", path: ["businessName"], message: "Enter the registered business name for the GST invoice" });
    if (d.createAccount && (!d.password || d.password.length < 8)) ctx.addIssue({ code: "custom", path: ["password"], message: "Choose a password of at least 8 characters" });
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letters and at least one number");

export const registerSchema = z.object({
  fullName: text(2, 120, "Enter your name"),
  email: emailSchema,
  phone: z.string().trim().optional().transform((v) => (v ? v : undefined)).refine((v) => !v || !!normalizeIndianMobile(v), "Enter a valid 10-digit Indian mobile number"),
  password: passwordSchema,
  marketingOptIn: z.boolean().default(false),
  website: z.string().max(200).optional(), // honeypot
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export const profileSchema = z.object({
  fullName: text(2, 120, "Enter your name"),
  phone: z.string().trim().optional().transform((v) => (v ? v : undefined)).refine((v) => !v || !!normalizeIndianMobile(v), "Enter a valid 10-digit Indian mobile number"),
  marketingOptIn: z.boolean().default(false),
});

export const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: optional(120),
  body: z.string().trim().min(10, "Tell others a little more (at least 10 characters)").max(3000),
});

export const newsletterSchema = z.object({ email: emailSchema, website: z.string().max(200).optional() });

export const cartAddSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(999),
  customization: z.record(z.string().max(40), z.union([z.string().max(500), z.boolean()])).default({}),
});
export const cartUpdateSchema = z.object({ itemId: z.uuid(), quantity: z.number().int().min(0).max(999) });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
