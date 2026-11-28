import "server-only";
import type { CartView } from "./cart";

/** What the browser receives about a cart — no internal ids beyond what it needs. */
export function publicCart(c: CartView) {
  const line = (l: CartView["lines"][number]) => ({
    id: l.id,
    variantId: l.variantId,
    productId: l.productId,
    slug: l.slug,
    name: l.name,
    variantTitle: l.variantTitle,
    imageUrl: l.imageUrl,
    unitPrice: l.unitPrice,
    compareAt: l.compareAt,
    quantity: l.quantity,
    maxQuantity: l.maxQuantity,
    customizationLabels: l.customizationLabels,
    lineTotal: l.lineTotal,
    issue: l.issue,
  });
  const t = c.totals;
  return {
    lines: c.lines.map(line),
    saved: c.saved.map(line),
    itemCount: c.itemCount,
    couponCode: c.couponCode,
    couponError: c.couponError,
    couponApplied: !!t.coupon?.applied,
    hasIssues: c.hasIssues,
    totals: {
      subtotal: t.subtotal,
      discountTotal: t.discountTotal,
      shippingTotal: t.shippingTotal,
      shippingFreeReason: t.shippingFreeReason,
      amountForFreeShipping: t.amountForFreeShipping,
      codFee: t.codFee,
      taxTotal: t.taxTotal,
      grandTotal: t.grandTotal,
      taxBreakdown: t.taxBreakdown,
    },
  };
}
export type PublicCart = ReturnType<typeof publicCart>;
