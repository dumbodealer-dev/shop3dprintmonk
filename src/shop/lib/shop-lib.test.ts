import { describe, expect, it } from "vitest";
import { computeTotals, type CouponRule, type PricingInput } from "./pricing";
import { isValidGstin, normalizeIndianMobile, stateCode } from "./india";
import { resolveCustomization } from "./customization";
import { parseCsv, toCsv } from "./csv";
import { checkoutSchema } from "./validation";

const base: PricingInput = {
  lines: [
    { key: "a", productId: "p1", categoryIds: ["c1"], unitPrice: 590, quantity: 2, gstRate: 18 },
    { key: "b", productId: "p2", categoryIds: ["c2"], unitPrice: 112, quantity: 1, gstRate: 12 },
  ],
  coupon: null,
  shipping: { id: "standard", label: "Standard", rate: 79, freeAbove: 999, },
  paymentMethod: "razorpay",
  codFee: 49,
  pricesIncludeTax: true,
  shippingGstRate: 18,
  storeStateCode: "07",
  destinationStateCode: "07",
};
const coupon = (c: Partial<CouponRule>): CouponRule => ({ id: "x", code: "C", type: "percent", value: 10, maxDiscount: null, minOrderValue: 0, appliesTo: "all", productIds: [], categoryIds: [], freeShipping: false, ...c });

describe("computeTotals", () => {
  it("inclusive GST: total equals sum of prices, tax extracted, intra-state split", () => {
    const t = computeTotals(base);
    expect(t.subtotal).toBe(1292);
    expect(t.shippingTotal).toBe(0); // over ₹999 → free
    expect(t.shippingFreeReason).toBe("threshold");
    expect(t.grandTotal).toBe(1292);
    // 1180 incl 18% → 180 tax; 112 incl 12% → 12 tax
    expect(t.taxTotal).toBe(192);
    expect(t.taxBreakdown.cgst + t.taxBreakdown.sgst).toBe(192);
    expect(t.taxBreakdown.igst).toBe(0);
  });
  it("inter-state uses IGST", () => {
    const t = computeTotals({ ...base, destinationStateCode: "27" });
    expect(t.taxBreakdown.type).toBe("inter");
    expect(t.taxBreakdown.igst).toBe(192);
  });
  it("exclusive GST adds tax on top", () => {
    const t = computeTotals({ ...base, pricesIncludeTax: false, lines: [{ ...base.lines[0], quantity: 1, unitPrice: 100 }], shipping: null });
    expect(t.taxTotal).toBe(18);
    expect(t.grandTotal).toBe(118);
  });
  it("charges shipping below threshold and reports the gap, plus COD fee", () => {
    const t = computeTotals({ ...base, lines: [base.lines[1]], paymentMethod: "cod" });
    expect(t.shippingTotal).toBe(79);
    expect(t.amountForFreeShipping).toBe(887);
    expect(t.codFee).toBe(49);
    expect(t.grandTotal).toBe(112 + 79 + 49);
  });
  it("percent coupon with cap, allocated across lines", () => {
    const t = computeTotals({ ...base, coupon: coupon({ value: 50, maxDiscount: 200 }) });
    expect(t.discountTotal).toBe(200);
    expect(t.lines.reduce((s, l) => s + l.discount, 0)).toBeCloseTo(200, 5);
    expect(t.grandTotal).toBe(1092 + 0); // still ≥ 999 → free shipping
  });
  it("discount drops order below free-shipping threshold → shipping charged", () => {
    const t = computeTotals({ ...base, coupon: coupon({ type: "fixed", value: 400 }) });
    expect(t.shippingTotal).toBe(79);
    expect(t.grandTotal).toBe(1292 - 400 + 79);
  });
  it("category coupon only discounts matching lines; min order enforced on eligible subtotal", () => {
    const t = computeTotals({ ...base, coupon: coupon({ appliesTo: "categories", categoryIds: ["c2"], value: 10 }) });
    expect(t.lines[0].discount).toBe(0);
    expect(t.lines[1].discount).toBe(11.2);
    const t2 = computeTotals({ ...base, coupon: coupon({ appliesTo: "categories", categoryIds: ["c2"], minOrderValue: 500 }) });
    expect(t2.coupon?.applied).toBe(false);
    expect(t2.discountTotal).toBe(0);
  });
  it("free-shipping coupon", () => {
    const t = computeTotals({ ...base, lines: [base.lines[1]], coupon: coupon({ type: "free_shipping", value: 0 }) });
    expect(t.shippingTotal).toBe(0);
    expect(t.shippingFreeReason).toBe("coupon");
  });
  it("fixed coupon never exceeds the cart value", () => {
    const t = computeTotals({ ...base, lines: [base.lines[1]], shipping: null, coupon: coupon({ type: "fixed", value: 5000 }) });
    expect(t.discountTotal).toBe(112);
    expect(t.grandTotal).toBe(0);
  });
});

describe("India helpers", () => {
  it("normalises mobiles", () => {
    expect(normalizeIndianMobile("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianMobile("+91-9876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("+919876543210");
    expect(normalizeIndianMobile("1234567890")).toBeNull();
  });
  it("validates GSTIN checksum", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("27AAPFU0939F1ZX")).toBe(false);
    expect(isValidGstin("XYZ")).toBe(false);
  });
  it("maps state names to GST codes", () => {
    expect(stateCode("Delhi")).toBe("07");
    expect(stateCode("maharashtra")).toBe("27");
  });
});

describe("customization", () => {
  const opts = [
    { id: "text", label: "Name", type: "text" as const, required: true, maxLength: 5, priceDelta: 0 },
    { id: "font", label: "Font", type: "select" as const, required: true, choices: [{ label: "A", priceDelta: 0 }, { label: "B", priceDelta: 20 }] },
    { id: "gift", label: "Gift", type: "checkbox" as const, required: false as const, priceDelta: 30 },
  ];
  it("computes surcharge and stable key", () => {
    const r = resolveCustomization(opts, { text: " Ria ", font: "B", gift: true, extra: "ignored" });
    expect(r.ok && r.surcharge).toBe(50);
    expect(r.ok && r.value).toEqual({ text: "Ria", font: "B", gift: true });
    const r2 = resolveCustomization(opts, { gift: true, font: "B", text: "Ria" });
    expect(r.ok && r2.ok && r.key === r2.key).toBe(true);
  });
  it("rejects missing/invalid/too long values and strips markup", () => {
    expect(resolveCustomization(opts, { font: "A" }).ok).toBe(false);
    expect(resolveCustomization(opts, { text: "toolong", font: "A" }).ok).toBe(false);
    expect(resolveCustomization(opts, { text: "Ok", font: "Z" }).ok).toBe(false);
    const r = resolveCustomization(opts, { text: "<b>", font: "A" });
    expect(r.ok && r.value.text).toBe("b");
  });
});

describe("csv", () => {
  it("round-trips quotes, commas and newlines; neutralises formulas", () => {
    const csv = toCsv([["a", 'say "hi"', "x,y", "line\nbreak", "=SUM(A1)", -5]]);
    const [row] = parseCsv(csv);
    expect(row).toEqual(["a", 'say "hi"', "x,y", "line\nbreak", "'=SUM(A1)", "-5"]);
  });
});

describe("checkout validation", () => {
  const addr = { fullName: "Asha", phone: "9876543210", line1: "12 MG Road", city: "Delhi", state: "Delhi", pincode: "110030" };
  const ok = { idempotencyKey: crypto.randomUUID(), contact: { email: "A@B.com", phone: "9876543210", fullName: "Asha" }, shippingAddress: addr, shippingMethod: "standard", paymentMethod: "cod", acceptTerms: true };
  it("accepts a valid order and normalises fields", () => {
    const r = checkoutSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.contact.email).toBe("a@b.com");
      expect(r.data.shippingAddress.phone).toBe("+919876543210");
    }
  });
  it("rejects bad PIN, GSTIN without business name", () => {
    expect(checkoutSchema.safeParse({ ...ok, shippingAddress: { ...addr, pincode: "011111" } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, gstin: "27AAPFU0939F1ZV" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...ok, gstin: "27AAPFU0939F1ZV", businessName: "Acme" }).success).toBe(true);
  });
});
