/** Money helpers. All amounts are rupees with up to 2 decimals; gateways use paise. */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const fromPaise = (paise: number) => round2(paise / 100);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,299 or ₹1,299.50 */
export function formatINR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isInteger(round2(v)) ? inr.format(round2(v)) : inr2.format(v);
}
/** Always two decimals (invoices). */
export const formatINR2 = (n: number | string | null | undefined) => inr2.format(Number(n ?? 0));

export function discountPercent(price: number, sale: number | null | undefined): number | null {
  if (sale == null || sale >= price || price <= 0) return null;
  return Math.round(((price - sale) / price) * 100);
}
