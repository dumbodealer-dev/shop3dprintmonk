import type { WhatsAppContext } from "@/lib/whatsapp";

export type ServiceSlug =
  | "fdm-3d-printing"
  | "sla-resin-3d-printing"
  | "bulk-batch-production"
  | "custom-3d-design"
  | "post-processing-finishing";

export interface Service {
  slug: ServiceSlug;
  name: string;
  shortName: string;
  icon: "layers" | "droplet" | "boxes" | "pen" | "brush";
  summary: string;
  bestFor: string[];
  whatsapp: WhatsAppContext;
  /** Real project photo in /public, e.g. "/images/services/fdm.webp". null = technical illustration. CONFIRM */
  image: string | null;
  seoTitle: string;
  seoDescription: string;
}

export const services: Service[] = [
  {
    slug: "fdm-3d-printing",
    name: "FDM 3D Printing",
    shortName: "FDM Printing",
    icon: "layers",
    summary:
      "Strong, economical parts printed layer by layer from engineering filaments — ideal for prototypes and working components.",
    bestFor: ["Functional prototypes", "Brackets, mounts & enclosures", "Larger components", "Economical batches"],
    whatsapp: "fdm",
    image: null,
    seoTitle: "FDM 3D Printing Service in Delhi NCR & India",
    seoDescription:
      "Custom FDM 3D printing in PLA, PETG, ABS, ASA, TPU, nylon and carbon-fibre filaments. Functional parts and prototypes from Delhi, delivered across India.",
  },
  {
    slug: "sla-resin-3d-printing",
    name: "SLA Resin 3D Printing",
    shortName: "SLA Resin Printing",
    icon: "droplet",
    summary:
      "High-detail resin prints with smooth surfaces — for miniatures, display models, jewellery patterns and precise small parts.",
    bestFor: ["Miniatures & collectibles", "Display & product models", "Jewellery patterns", "Fine-detail parts"],
    whatsapp: "sla",
    image: null,
    seoTitle: "SLA Resin 3D Printing Service in Delhi | High-Detail Prints",
    seoDescription:
      "Resin (SLA) 3D printing in Delhi for miniatures, product models, dental and jewellery patterns. Standard, tough, flexible, clear and castable resins.",
  },
  {
    slug: "bulk-batch-production",
    name: "Bulk & Batch Production",
    shortName: "Bulk Production",
    icon: "boxes",
    summary:
      "From a validated prototype to repeat production runs — quantity-based quotes, batch finishing and consistent inspection.",
    bestFor: ["Small-batch manufacturing", "Repeat orders", "Multi-part assemblies", "Corporate & promotional runs"],
    whatsapp: "bulk",
    image: null,
    seoTitle: "Bulk 3D Printing & Batch Production for Businesses | India",
    seoDescription:
      "Bulk and batch 3D printing for businesses: quantity-based quotations, repeat production, batch finishing and confidential handling of your designs.",
  },
  {
    slug: "custom-3d-design",
    name: "Custom 3D Design",
    shortName: "3D Design",
    icon: "pen",
    summary:
      "No 3D file? Share a sketch, photo, drawing or physical part and we'll help turn it into a print-ready model.",
    bestFor: ["Ideas & sketches to 3D", "Replacement parts", "Modifying existing CAD", "Print-ready file preparation"],
    whatsapp: "design",
    image: null,
    seoTitle: "Custom 3D Design & 3D Modelling Service for Printing",
    seoDescription:
      "Turn sketches, photos, drawings or existing parts into print-ready 3D models. Custom 3D design and model preparation by 3D PRINTMONK.",
  },
  {
    slug: "post-processing-finishing",
    name: "Sanding, Painting & Finishing",
    shortName: "Finishing",
    icon: "brush",
    summary:
      "Support removal, sanding, priming, painting and coating that take a print from raw to presentation-ready.",
    bestFor: ["Display & presentation models", "Painted miniatures", "Smooth customer-facing parts", "Assembly"],
    whatsapp: "finishing",
    image: null,
    seoTitle: "3D Print Finishing: Sanding, Priming & Painting Services",
    seoDescription:
      "Post-processing for 3D prints — support removal, sanding, priming, painting, coating and assembly. Availability and pricing depend on the project.",
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
