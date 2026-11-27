import { z } from "zod";

/** Shared by the browser (inline feedback) and the server (authoritative). */

export const CUSTOMER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
] as const;

export const TECHNOLOGIES = [
  { value: "fdm", label: "FDM (filament)", hint: "Functional parts, prototypes, larger components" },
  { value: "sla", label: "SLA (resin)", hint: "Fine detail, miniatures, smooth surfaces" },
  { value: "not_sure", label: "Not sure — please advise", hint: "We'll recommend the right process" },
] as const;

export const FINISHING_OPTIONS = [
  { value: "none", label: "No finishing (as printed)" },
  { value: "support_removal", label: "Support removal & clean-up" },
  { value: "sanding", label: "Sanding" },
  { value: "priming", label: "Priming" },
  { value: "painting", label: "Painting" },
  { value: "coating", label: "Coating / clear coat" },
  { value: "assembly", label: "Assembly" },
  { value: "advise", label: "Not sure — please advise" },
] as const;

export const DESIGN_INPUTS = [
  { value: "reference_images", label: "Reference images" },
  { value: "sketch", label: "Hand sketch" },
  { value: "physical_part", label: "Existing physical part" },
  { value: "cad", label: "CAD file to modify" },
  { value: "drawing", label: "Technical drawing" },
  { value: "concept", label: "Product concept / idea" },
] as const;

export const ENQUIRY_TYPES = ["quote", "design", "bulk"] as const;

const values = <T extends readonly { value: string }[]>(arr: T) =>
  arr.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const customerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  company: optionalText(160),
  email: z.email("Please enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{8,20}$/, "Please enter a valid phone number, e.g. +91 98xxxxxxxx"),
  city: z.string().trim().min(2, "Please enter your city").max(80),
  customerType: z.enum(values(CUSTOMER_TYPES), { error: "Please choose a customer type" }),
});

export const projectSchema = z.object({
  title: z.string().trim().min(3, "Give your project a short title").max(140),
  technology: z.enum(values(TECHNOLOGIES), { error: "Please choose a technology (or Not sure)" }),
  material: optionalText(120),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1_000_000, "For very large volumes please contact us directly"),
  dimensions: optionalText(160),
  deliveryDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date"),
  application: optionalText(300),
  finishing: z.array(z.enum(values(FINISHING_OPTIONS))).max(8).default([]),
  notes: optionalText(4000),
});

export const uploadedFileSchema = z.object({
  path: z.string().min(10).max(400),
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
});

/** Browser-computed preliminary estimate — stored for reference only, never trusted for billing. */
export const estimateSchema = z
  .object({
    mode: z.enum(["instant", "manual"]),
    low: z.number().nonnegative().max(1e8).nullable().optional(),
    high: z.number().nonnegative().max(1e8).nullable().optional(),
    material: z.string().max(120).optional(),
    technology: z.string().max(10).optional(),
    reasons: z.array(z.string().max(300)).max(10).default([]),
    lines: z
      .array(
        z.object({
          name: z.string().max(200),
          grams: z.number().nonnegative().max(1e7),
          supportGrams: z.number().nonnegative().max(1e7).optional(),
          sizeMm: z.array(z.number().nonnegative().max(1e6)).length(3),
          unitPrice: z.number().nonnegative().max(1e8),
          quantity: z.number().int().positive().max(1e6),
          subtotal: z.number().nonnegative().max(1e9),
        }),
      )
      .max(50)
      .default([]),
  })
  .optional();

export const quoteSubmissionSchema = z
  .object({
    enquiryType: z.enum(ENQUIRY_TYPES).default("quote"),
    customer: customerSchema,
    project: projectSchema,
    designInputs: z.array(z.enum(values(DESIGN_INPUTS))).max(6).default([]),
    needsDesign: z.boolean().default(false),
    files: z.array(uploadedFileSchema).max(50).default([]),
    uploadSession: z.uuid(),
    permissionConfirmed: z.boolean().default(false),
    privacyAccepted: z.literal(true, { error: "Please accept the privacy notice to continue" }),
    estimate: estimateSchema,
    // Spam protection
    website: z.string().max(500).optional(), // honeypot — checked in the route (must stay empty)
    startedAt: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.files.length > 0 && !data.permissionConfirmed) {
      ctx.addIssue({
        code: "custom",
        path: ["permissionConfirmed"],
        message: "Please confirm you have permission to share these files",
      });
    }
    if (data.files.length === 0 && !data.needsDesign && (data.project.notes?.length ?? 0) < 20) {
      ctx.addIssue({
        code: "custom",
        path: ["project", "notes"],
        message: "Without a file, please describe your project in a few sentences (or tick “I need help creating the design”)",
      });
    }
  });

export type QuoteSubmission = z.infer<typeof quoteSubmissionSchema>;

export const uploadRequestSchema = z.object({
  uploadSession: z.uuid(),
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
  allowReferences: z.boolean().default(false),
  existingCount: z.number().int().min(0).default(0),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(200),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^\+?[0-9\s()-]{8,20}$/.test(v), "Please enter a valid phone number"),
  subject: optionalText(160),
  message: z.string().trim().min(10, "Please write a short message").max(4000),
  website: z.string().max(500).optional(), // honeypot
  startedAt: z.number().int().positive(),
});

export type ContactSubmission = z.infer<typeof contactSchema>;

/** Flatten zod issues into { "customer.email": "message" } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function labelFor<T extends readonly { value: string; label: string }[]>(arr: T, value: string) {
  return arr.find((o) => o.value === value)?.label ?? value;
}
