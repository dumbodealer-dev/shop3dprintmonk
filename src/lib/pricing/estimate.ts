import { defaultMaterial, materialPricing, pricingRules as R } from "@/config/pricing";
import type { MeshAnalysis } from "./mesh";

export type EstimatePart = { id?: string; name: string; analysis: MeshAnalysis | null };
export type RateOverride = { slug: string; name: string; technology: "fdm" | "sla"; ratePerGram?: number | null; density?: number | null };

export type EstimateInput = {
  parts: EstimatePart[];
  technology: string; // fdm | sla | not_sure | ""
  materialSlug?: string; // slug or "" / "advise"
  quantity: number;
  finishing: string[];
  enquiryType: "quote" | "bulk" | "design";
  needsDesign: boolean;
  /** Files that can't be analysed in the browser (STEP, images, PDFs) */
  unanalysedFiles: number;
  materials: RateOverride[];
};

export type EstimateLine = {
  id?: string;
  name: string;
  /** Total = model + supports */
  grams: number;
  modelGrams: number;
  supportGrams: number;
  /** Price of the support material for one part (₹) */
  supportCost: number;
  sizeMm: [number, number, number];
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
};

export type Estimate = {
  mode: "instant" | "manual";
  reasons: string[];
  notes: string[];
  technology: "fdm" | "sla";
  materialSlug: string;
  materialName: string;
  ratePerGram: number;
  lines: EstimateLine[];
  /** Weight-based cost before the minimum charge. */
  printCost: number;
  minimumCharge: number;
  minimumApplied: boolean;
  total: number;
  low: number;
  high: number;
};

const round10 = (n: number) => Math.round(n / 10) * 10;

export function estimate(input: EstimateInput): Estimate {
  const reasons: string[] = [];
  const notes: string[] = [];

  const tech: "fdm" | "sla" = input.technology === "sla" ? "sla" : "fdm";
  if (input.technology === "not_sure" || !input.technology) notes.push("Estimated for FDM printing — we'll confirm the best process.");

  let slug = input.materialSlug && input.materialSlug !== "advise" ? input.materialSlug : defaultMaterial[tech];
  let mat = input.materials.find((m) => m.slug === slug);
  if (mat && mat.technology !== tech) {
    slug = defaultMaterial[tech];
    mat = input.materials.find((m) => m.slug === slug);
  }
  if (!input.materialSlug || input.materialSlug === "advise") notes.push(`Estimated in ${mat?.name ?? slug} — we'll recommend the right material.`);
  const base = materialPricing[slug] ?? materialPricing[defaultMaterial[tech]];
  const ratePerGram = mat?.ratePerGram ?? base.ratePerGram;
  const density = mat?.density ?? base.density;
  const rules = R[tech];

  // ── Manual-quote conditions ───────────────────────────────────────────────
  if (input.enquiryType === "bulk") reasons.push("Bulk orders get a dedicated quotation.");
  if (input.enquiryType === "design" || input.needsDesign) reasons.push("Design work is quoted after we review your brief.");
  if (input.parts.length === 0 && input.unanalysedFiles === 0) reasons.push("Upload an STL, OBJ or 3MF file to see an instant estimate.");
  if (input.unanalysedFiles > 0) reasons.push("STEP files, very large models and reference images are reviewed manually.");
  if (input.parts.some((p) => !p.analysis)) reasons.push("One or more files couldn't be read automatically.");
  if (input.quantity > R.maxQtyPerPart || input.quantity * input.parts.length > R.maxTotalPieces)
    reasons.push(`Orders above ${R.maxQtyPerPart} pieces per part are quoted as bulk orders.`);
  const manualFinish = input.finishing.filter((f) => R.manualFinishing.includes(f));
  if (manualFinish.length) reasons.push("Painting and assembly are priced after reviewing the part.");

  const lines: EstimateLine[] = [];
  for (const p of input.parts) {
    const a = p.analysis;
    if (!a) continue;
    const dims = [...a.size].sort((x, y) => y - x);
    if (a.volumeMm3 < 1 || dims[0] < 2) {
      reasons.push(`${p.name}: the model looks empty or too small — check its units.`);
      continue;
    }
    // No size limit: any part size gets an estimate. Very large readings are usually a units mix-up.
    if (dims[0] > 2000) notes.push(`${p.name}: please confirm the model is in millimetres.`);
    if (a.watertight === false) notes.push(`${p.name}: mesh has open edges — weight is approximate and the file may need repair.`);

    const volCm3 = a.volumeMm3 / 1000;
    const areaCm2 = a.areaMm2 / 100;
    let effCm3: number;
    if (tech === "fdm") {
      const shell = Math.min(volCm3, areaCm2 * R.fdm.shellCm);
      effCm3 = shell + Math.max(volCm3 - shell, 0) * R.fdm.infill;
    } else {
      effCm3 = volCm3 > R.sla.hollowAboveCm3 ? Math.min(volCm3, areaCm2 * R.sla.hollowShellCm) : volCm3;
    }
    const modelGrams = effCm3 * density * rules.wasteFactor;
    const supportCm3 = (tech === "fdm" ? a.supportFdmMm3 * R.fdm.supportFill : a.supportSlaMm3 * R.sla.supportFill) / 1000;
    const supportGrams = supportCm3 * density + (tech === "sla" ? modelGrams * R.sla.raftFactor : 0);
    const grams = modelGrams + supportGrams;
    const finishMult = input.finishing.reduce((m, f) => m * (R.finishing[f] ?? 1), 1);
    const unit = grams * ratePerGram * finishMult;
    const discount = R.quantityDiscounts.find((d) => input.quantity >= d.minQty)?.discount ?? 0;
    lines.push({
      id: p.id,
      name: p.name,
      grams: Math.round(grams * 10) / 10,
      modelGrams: Math.round(modelGrams * 10) / 10,
      supportGrams: Math.round(supportGrams * 10) / 10,
      supportCost: Math.round(supportGrams * ratePerGram * finishMult * 100) / 100,
      sizeMm: a.size.map((s) => Math.round(s * 10) / 10) as [number, number, number],
      unitPrice: Math.round(unit * 100) / 100,
      quantity: input.quantity,
      discount,
      subtotal: Math.round(unit * input.quantity * (1 - discount)),
    });
  }

  const printCost = lines.reduce((s, l) => s + l.subtotal, 0);
  const minimumApplied = printCost < R.minimumCharge;
  const total = Math.max(R.minimumCharge, printCost);
  if (lines.length && total > R.maxInstantTotal) reasons.push("Higher-value orders get a detailed manual quotation.");
  if (lines.length && minimumApplied) notes.push(`Minimum printing charge of ₹${R.minimumCharge} applies to this order.`);

  const mode = reasons.length === 0 && lines.length > 0 ? "instant" : "manual";
  return {
    mode,
    reasons: [...new Set(reasons)],
    notes: [...new Set(notes)],
    technology: tech,
    materialSlug: slug,
    materialName: mat?.name ?? slug,
    ratePerGram,
    lines,
    printCost,
    minimumCharge: R.minimumCharge,
    minimumApplied,
    total,
    // The minimum is fixed; only the weight-based part carries uncertainty.
    low: Math.max(R.minimumCharge, round10(printCost * R.rangeLow)),
    high: Math.max(R.minimumCharge, round10(printCost * R.rangeHigh)),
  };
}
