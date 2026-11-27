import { business } from "@/config/business";

export interface FaqItem {
  q: string;
  a: string;
  /** Answer depends on a business policy not yet confirmed — review before launch. */
  needsConfirmation?: boolean;
}

const gst =
  business.policies.gstInvoice === true
    ? `Yes. We provide GST invoices${business.policies.gstin ? ` (GSTIN ${business.policies.gstin})` : ""}. Add your company name and GST number in the quote form notes.`
    : "Please mention it in your quote request along with your company name and GST number, and we'll confirm invoicing details with your quotation.";

const nda =
  business.policies.signsNda === true
    ? "Yes. Tick the confidentiality note in your request or ask us for an NDA before you share files. Uploaded files are stored privately and are only accessed by our team for your project."
    : "Yes, you can ask for a confidential quotation. Uploaded files are stored privately and only accessed by our team to review your project. If you need an NDA, mention it in your request and we'll discuss it before you share detailed files.";

export const faqs: FaqItem[] = [
  {
    q: "What is 3D printing?",
    a: "3D printing builds a physical object layer by layer from a digital 3D model. It's ideal for prototypes, custom parts and small production runs because no moulds or tooling are needed — so changing a design is as simple as editing the file.",
  },
  {
    q: "What file formats do you accept?",
    a: "For printing we accept STL, OBJ, 3MF, STEP and STP files. If you don't have a 3D model yet, you can share reference photos, sketches, drawings or PDFs and choose “I need help creating the design”.",
  },
  {
    q: "Can you help create a 3D model?",
    a: "Yes. Our custom 3D design service turns sketches, photos, technical drawings, existing physical parts or rough ideas into print-ready models. Use the design enquiry form and tell us how the part will be used.",
  },
  {
    q: "Which is better, FDM or SLA?",
    a: "Neither is universally better. FDM (filament) is usually the economical choice for functional parts, prototypes and larger components. SLA (resin) gives much finer detail and smoother surfaces for miniatures, display models and small precise parts. The right choice depends on how the part will be used, its size, material needs and budget — choose “Not sure” and we'll recommend one.",
  },
  {
    q: "What materials are available?",
    a: "We work with a range of filaments (such as PLA, PETG, ABS, ASA, TPU, nylon and carbon-fibre-filled grades) and resins (standard, tough, flexible, clear and castable). Availability and colours change, so we confirm the exact material with every quotation. See the Materials page for properties and typical uses.",
    needsConfirmation: true,
  },
  {
    q: "How much does 3D printing cost?",
    a: "Price depends on the part's size and volume, the material, quantity and finishing. Upload an STL, OBJ or 3MF file on the Get a Quote page to see an instant preliminary estimate in rupees. The minimum printing charge is ₹300 per order; above that you pay for the material your parts actually use. Complex, painted, STEP-based or bulk orders get a detailed manual quotation. Our team confirms the final price before anything is printed.",
  },
  {
    q: "Do you offer bulk printing?",
    a: "Yes. We handle everything from a single prototype to batch and repeat production. Quantity-based pricing, batch finishing and inspection are covered on our Bulk & Batch Production page.",
  },
  {
    q: "Can you print large models?",
    a: "Yes — there's no size limit. Send us the overall dimensions and we'll plan the best way to produce your model, from small parts to very large pieces.",
  },
  {
    q: "Do you offer painting and finishing?",
    a: "Yes. We offer support removal, sanding, priming, painting and coating, plus assembly where applicable. Availability and pricing depend on the project, so describe the finish you need in your request.",
  },
  {
    q: "How long does printing take?",
    a: "We're open 24×7, and the timeline depends on the size, quantity, technology and finishing involved. We'll give you a realistic timeline with your quotation. If you have a deadline, add it in the “Required delivery date” field.",
    needsConfirmation: true,
  },
  {
    q: "Do you deliver outside Delhi — or outside India?",
    a: "Yes. We're based in New Delhi and deliver across India — and outside India too. International shipping, customs and delivery timelines are confirmed with your quotation.",
  },
  {
    q: "Can I order the same part repeatedly?",
    a: "Yes. Quote your previous enquiry reference number when you reorder so we can match the approved material, settings and finish as closely as possible.",
  },
  { q: "Do you provide GST invoices?", a: gst, needsConfirmation: business.policies.gstInvoice === null },
  { q: "Can I request a confidential quotation?", a: nda, needsConfirmation: business.policies.signsNda === null },
];
