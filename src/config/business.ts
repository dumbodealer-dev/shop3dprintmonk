/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  3D PRINTMONK — BUSINESS INFORMATION
 * ─────────────────────────────────────────────────────────────────────────────
 *  This is the single place to edit verified business details.
 *
 *  RULE: leave a value as `null` until it has been confirmed against the
 *  existing website / company records. Anything that is `null` is simply not
 *  shown on the site (no placeholders, no invented numbers), and the
 *  "Setup required" banner lists it so nothing is forgotten before launch.
 *
 *  Search the codebase for "CONFIRM" to find every item that needs a decision.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BusinessHours = { days: string; hours: string };

export type BusinessStat = { label: string; value: string };

export const business = {
  name: "3D PRINTMONK",
  legalName: null as string | null, // CONFIRM: registered company name, used in Terms/Privacy & schema
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.3dprintmonk.com",
  tagline: "Custom FDM & SLA 3D printing — from one prototype to bulk production.",
  /** Company motto, highlighted on the About page. */
  motto: "We wish to open a very big 3D print farm where you can get 24×7 printing service in India.",

  /** Path to the official logo in /public (SVG or PNG). null = text wordmark. CONFIRM */
  logo: "/brand/logo-mark.webp" as string | null,
  /** Full logo with wordmark (for light backgrounds). */
  logoFull: "/brand/logo-full.webp",

  contact: {
    /** E.164 without spaces, e.g. "+919876543210". CONFIRM */
    phone: "+919140521406" as string | null,
    /** Digits only incl. country code, e.g. "919876543210". CONFIRM */
    whatsapp: "919140521406" as string | null,
    /** Public enquiry email shown on the site. CONFIRM */
    email: "contact@3dprintmonk.com" as string | null, // CONFIRM: provided as "contact@3dprintmonk" — assumed .com
  },

  social: {
    instagram: "https://www.instagram.com/3dprintmonk/" as string | null,
  },

  address: {
    /** Set `verified: true` only once matched to company records — it enables LocalBusiness schema. */
    verified: true,
    street: "3D PRINTMONK, Near Tiles Godown" as string | null,
    locality: "Sultanpur" as string | null,
    city: "New Delhi",
    region: "Delhi",
    postalCode: "110030" as string | null,
    country: "IN",
    /** Google Maps share link for the business listing. CONFIRM */
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=3D+PRINTMONK+Near+Tiles+Godown+Sultanpur+New+Delhi+110030" as string | null,
    /** Google Maps *embed* URL (Share → Embed a map → src). CONFIRM */
    mapsEmbedUrl: "https://www.google.com/maps?q=Sultanpur,+New+Delhi+110030&output=embed" as string | null,
    /** Whether customers can visit / collect in person. CONFIRM */
    walkInsWelcome: null as boolean | null,
  },

  /** CONFIRM: leave empty to hide hours. */
  hours: [{ days: "Monday – Sunday", hours: "Open 24 hours" }] as BusinessHours[],
  /** Shown as a badge across the site. */
  open24x7: true,

  /** Service area wording (provided by the business). */
  serviceArea: {
    primary: "Delhi NCR",
    secondary: "Pan-India & international delivery",
    international: true,
  },

  /**
   * Verified statistics ONLY. Leave empty and the stats band is not rendered.
   * Example: { label: "Projects completed", value: "1,200+" }
   */
  stats: [] as BusinessStat[],

  /** Year the business started — used on About page if set. CONFIRM */
  foundedYear: null as number | null,

  /**
   * Verified machine capabilities. Every null is hidden on the site; service
   * pages then say these are confirmed with the quotation.
   */
  capabilities: {
    fdmLayerHeights: null as string | null, // CONFIRM e.g. "0.1 – 0.3 mm"
    slaLayerHeights: null as string | null, // CONFIRM
    printers: [] as string[], // CONFIRM: machine models, only if you want them published
  },

  /** Commercial policies. null = not stated on the site; customers are asked to mention it. */
  policies: {
    gstInvoice: null as boolean | null, // CONFIRM
    gstin: null as string | null, // CONFIRM
    acceptsPurchaseOrders: null as boolean | null, // CONFIRM
    signsNda: null as boolean | null, // CONFIRM
    panIndiaShipping: true, // Stated by the business.
    internationalShipping: true, // Stated by the business: delivers outside India too.
  },
} as const;

/** Items still awaiting confirmation — surfaced in the setup banner & README. */
export function missingBusinessInfo(): string[] {
  const missing: string[] = [];
  if (!business.contact.phone) missing.push("Phone number");
  if (!business.contact.whatsapp) missing.push("WhatsApp number");
  if (!business.contact.email) missing.push("Public email");
  if (!business.address.verified) missing.push("Verified address");
  if (!business.social.instagram) missing.push("Instagram URL");
  if (business.hours.length === 0) missing.push("Business hours");
  return missing;
}
