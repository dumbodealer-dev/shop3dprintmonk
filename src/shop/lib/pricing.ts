import { round2 } from "./money";

/**
 * The single price calculator for carts, checkout and orders. Pure and
 * deterministic; the server always feeds it live prices from the database, so
 * totals can't be influenced from the browser. Unit tested in pricing.test.ts.
 */

export type PricingLine = {
  key: string;
  productId: string;
  categoryIds: string[]; // product category + its parent
  unitPrice: number; // incl. customisation surcharge
  quantity: number;
  gstRate: number;
};

export type CouponRule = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  appliesTo: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  freeShipping: boolean;
};

export type PricingInput = {
  lines: PricingLine[];
  coupon: CouponRule | null;
  shipping: { id: string; label: string; rate: number; freeAbove: number | null } | null;
  paymentMethod: "razorpay" | "cod" | null;
  codFee: number;
  pricesIncludeTax: boolean;
  shippingGstRate: number;
  /** GST state codes. Same state → CGST + SGST, otherwise IGST. Unknown destination → intra-state estimate. */
  storeStateCode: string | null;
  destinationStateCode: string | null;
};

export type PricedLine = PricingLine & {
  lineSubtotal: number;
  discount: number;
  taxable: number;
  taxAmount: number;
  lineTotal: number;
};

export type Totals = {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingFreeReason: "threshold" | "coupon" | null;
  amountForFreeShipping: number | null;
  codFee: number;
  taxTotal: number;
  grandTotal: number;
  taxBreakdown: { type: "intra" | "inter"; cgst: number; sgst: number; igst: number; taxableValue: number; byRate: { rate: number; taxable: number; tax: number }[] };
  coupon: { code: string; applied: boolean; message: string | null } | null;
};

const taxOf = (amount: number, rate: number, inclusive: boolean) => (inclusive ? (amount * rate) / (100 + rate) : (amount * rate) / 100);

export function couponEligible(line: PricingLine, c: CouponRule) {
  if (c.appliesTo === "products") return c.productIds.includes(line.productId);
  if (c.appliesTo === "categories") return line.categoryIds.some((id) => c.categoryIds.includes(id));
  return true;
}

export function computeTotals(input: PricingInput): Totals {
  const lines: PricedLine[] = input.lines.map((l) => {
    const lineSubtotal = round2(l.unitPrice * l.quantity);
    return { ...l, lineSubtotal, discount: 0, taxable: 0, taxAmount: 0, lineTotal: lineSubtotal };
  });
  const subtotal = round2(lines.reduce((s, l) => s + l.lineSubtotal, 0));

  // ── Coupon ────────────────────────────────────────────────────────────────
  let couponResult: Totals["coupon"] = null;
  let couponFreeShipping = false;
  const c = input.coupon;
  if (c) {
    const eligible = lines.filter((l) => couponEligible(l, c));
    const eligibleSubtotal = round2(eligible.reduce((s, l) => s + l.lineSubtotal, 0));
    if (!eligible.length) couponResult = { code: c.code, applied: false, message: "This code doesn't apply to the items in your cart." };
    else if (eligibleSubtotal < c.minOrderValue)
      couponResult = { code: c.code, applied: false, message: `Add items worth ₹${round2(c.minOrderValue - eligibleSubtotal)} more to use this code.` };
    else {
      let discount = 0;
      if (c.type === "percent") discount = (eligibleSubtotal * c.value) / 100;
      else if (c.type === "fixed") discount = c.value;
      if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
      discount = round2(Math.min(discount, eligibleSubtotal));
      // Spread the discount over eligible lines in proportion to their value (last line takes the rounding).
      let left = discount;
      eligible.forEach((l, i) => {
        const share = i === eligible.length - 1 ? left : round2((discount * l.lineSubtotal) / eligibleSubtotal);
        l.discount = round2(Math.min(share, l.lineSubtotal));
        left = round2(left - l.discount);
      });
      couponFreeShipping = c.type === "free_shipping" || c.freeShipping;
      couponResult = { code: c.code, applied: true, message: null };
    }
  }
  const discountTotal = round2(lines.reduce((s, l) => s + l.discount, 0));
  const afterDiscount = round2(subtotal - discountTotal);

  // ── Shipping ──────────────────────────────────────────────────────────────
  let shippingTotal = 0;
  let shippingFreeReason: Totals["shippingFreeReason"] = null;
  let amountForFreeShipping: number | null = null;
  if (input.shipping && lines.length) {
    const s = input.shipping;
    if (couponFreeShipping) shippingFreeReason = "coupon";
    else if (s.freeAbove != null && afterDiscount >= s.freeAbove) shippingFreeReason = "threshold";
    else {
      shippingTotal = round2(s.rate);
      if (s.freeAbove != null) amountForFreeShipping = round2(s.freeAbove - afterDiscount);
    }
  }
  const codFee = input.paymentMethod === "cod" && lines.length ? round2(input.codFee) : 0;

  // ── GST ───────────────────────────────────────────────────────────────────
  const inclusive = input.pricesIncludeTax;
  const byRate = new Map<number, { taxable: number; tax: number }>();
  const addRate = (rate: number, taxable: number, tax: number) => {
    const r = byRate.get(rate) ?? { taxable: 0, tax: 0 };
    r.taxable += taxable;
    r.tax += tax;
    byRate.set(rate, r);
  };
  for (const l of lines) {
    const net = round2(l.lineSubtotal - l.discount);
    l.taxAmount = round2(taxOf(net, l.gstRate, inclusive));
    l.taxable = round2(inclusive ? net - l.taxAmount : net);
    l.lineTotal = round2(inclusive ? net : net + l.taxAmount);
    addRate(l.gstRate, l.taxable, l.taxAmount);
  }
  const fees = round2(shippingTotal + codFee);
  const feeTax = round2(taxOf(fees, input.shippingGstRate, inclusive));
  if (fees > 0) addRate(input.shippingGstRate, round2(inclusive ? fees - feeTax : fees), feeTax);

  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0) + (fees > 0 ? feeTax : 0));
  const taxableValue = round2([...byRate.values()].reduce((s, r) => s + r.taxable, 0));
  const intra = !input.destinationStateCode || !input.storeStateCode || input.destinationStateCode === input.storeStateCode;
  const cgst = intra ? round2(taxTotal / 2) : 0;
  const sgst = intra ? round2(taxTotal - cgst) : 0;
  const igst = intra ? 0 : taxTotal;

  const grandTotal = inclusive ? round2(afterDiscount + fees) : round2(afterDiscount + fees + taxTotal);

  return {
    lines,
    subtotal,
    discountTotal,
    shippingTotal,
    shippingFreeReason,
    amountForFreeShipping,
    codFee,
    taxTotal,
    grandTotal,
    taxBreakdown: {
      type: intra ? "intra" : "inter",
      cgst,
      sgst,
      igst,
      taxableValue,
      byRate: [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, taxable: round2(v.taxable), tax: round2(v.tax) })),
    },
    coupon: couponResult,
  };
}
