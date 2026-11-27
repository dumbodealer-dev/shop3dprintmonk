/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  INSTANT ESTIMATE — PRICING RULES (all amounts in INR, excluding GST & shipping)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Price = max(₹300 minimum charge, Σ grams × ₹/g × finishing × quantity − discounts).
 *  Default per-gram rates are mid-range Indian market rates for 3D printing
 *  services (late 2026), e.g. PLA ₹5–15/g, PETG ₹10–20/g, resin ₹15–50/g.
 *  Adjust them here, or per material in Supabase → materials.rate_per_gram_inr
 *  (the database value wins when set).
 *
 *  These produce a PRELIMINARY estimate only. Every order is reviewed and the
 *  final price is confirmed by the team before printing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type MaterialPricing = { ratePerGram: number; density: number };

/** Keyed by material slug (see src/content/materials.ts). density in g/cm³. */
export const materialPricing: Record<string, MaterialPricing> = {
  // FDM filaments
  pla: { ratePerGram: 8, density: 1.24 },
  petg: { ratePerGram: 10, density: 1.27 },
  abs: { ratePerGram: 12, density: 1.04 },
  asa: { ratePerGram: 14, density: 1.07 },
  tpu: { ratePerGram: 18, density: 1.21 },
  nylon: { ratePerGram: 30, density: 1.14 },
  "carbon-fiber-nylon": { ratePerGram: 35, density: 1.2 },
  // SLA resins
  "standard-resin": { ratePerGram: 18, density: 1.12 },
  "tough-resin": { ratePerGram: 22, density: 1.15 },
  "flexible-resin": { ratePerGram: 30, density: 1.1 },
  "clear-resin": { ratePerGram: 25, density: 1.12 },
  "castable-resin": { ratePerGram: 45, density: 1.1 },
};

/** Material used when the customer has no preference. */
export const defaultMaterial = { fdm: "pla", sla: "standard-resin" } as const;

export const pricingRules = {
  fdm: {
    /** Wall/skin thickness used to approximate the printed shell (cm). */
    shellCm: 0.08,
    /** Typical infill for general-purpose parts. */
    infill: 0.2,
    /** Purge, brim and waste allowance (supports are calculated separately). */
    wasteFactor: 1.05,
    /** Support structures are sparse: fraction of the supported space actually filled. */
    supportFill: 0.15,
  },
  sla: {
    /** Parts above this volume (cm³) are assumed hollowed with this wall (cm). */
    hollowAboveCm3: 30,
    hollowShellCm: 0.25,
    wasteFactor: 1.05,
    /** Resin supports are thin pillars + a raft: fraction of the supported space filled. */
    supportFill: 0.08,
    /** Raft/base under the part, as a fraction of the model's own material. */
    raftFactor: 0.05,
  },
  /**
   * Minimum printing charge per order (₹). If the weight-based cost is lower
   * (e.g. ₹10 or ₹200), the customer pays this; above it, the actual cost applies.
   */
  minimumCharge: 300,
  /** Finishing price multipliers. Options not listed here need a manual quote. */
  finishing: {
    none: 1,
    support_removal: 1,
    advise: 1,
    sanding: 1.25,
    priming: 1.2,
    coating: 1.15,
  } as Record<string, number>,
  manualFinishing: ["painting", "assembly"],
  /** Quantity discounts (applied per part line). */
  quantityDiscounts: [
    { minQty: 10, discount: 0.1 },
    { minQty: 5, discount: 0.05 },
  ],
  /**
   * Above these, the enquiry is treated as a bulk / high-value order → manual quote.
   * There is deliberately NO part-size limit: large parts are always accepted.
   */
  maxQtyPerPart: 20,
  maxTotalPieces: 50,
  maxInstantTotal: 25_000,
  /** Shown as a range around the computed figure. */
  rangeLow: 0.9,
  rangeHigh: 1.15,
  gstRate: 0.18,
};
