import "server-only";
import { esc } from "@/lib/email";
import { formatINR2, round2 } from "@/shop/lib/money";
import { stateCode } from "@/shop/lib/india";
import type { OrderRow } from "./orders";
import { getSettings } from "./settings";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + words(n % 100) : ""}`;
  if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand${n % 1000 ? " " + words(n % 1000) : ""}`;
  if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh${n % 100000 ? " " + words(n % 100000) : ""}`;
  return `${words(Math.floor(n / 10000000))} Crore${n % 10000000 ? " " + words(n % 10000000) : ""}`;
}
/** Indian-system amount in words, e.g. "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only". */
export function amountInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  return `Rupees ${rupees ? words(rupees) : "Zero"}${paise ? ` and ${words(paise)} Paise` : ""} Only`;
}

/** Full GST tax invoice as a standalone HTML document (print / save as PDF from the browser). */
export async function renderInvoiceHtml(o: OrderRow): Promise<string> {
  const s = (await getSettings()).store;
  const intra = (o.tax_breakdown?.type ?? "intra") === "intra";
  const inclusive = o.prices_include_tax;
  const b = o.billing_address;
  const sh = o.shipping_address;
  const pos = `${sh.state} (${stateCode(sh.state) ?? "--"})`;

  const rows = o.items
    .map((i, n) => {
      const taxable = round2(inclusive ? i.line_total - i.tax_amount : i.line_total - i.tax_amount);
      const half = round2(i.tax_amount / 2);
      const custom = Object.entries(i.customization ?? {}).map(([k, v]) => `${k}: ${v}`).join("; ");
      return `<tr>
<td>${n + 1}</td>
<td>${esc(i.product_name)}${i.variant_title ? `<div class="m">${esc(i.variant_title)}</div>` : ""}${custom ? `<div class="m">${esc(custom)}</div>` : ""}${i.sku ? `<div class="m">SKU ${esc(i.sku)}</div>` : ""}</td>
<td>${esc(i.hsn_code ?? "")}</td>
<td class="r">${i.quantity}</td>
<td class="r">${formatINR2(i.unit_price)}</td>
<td class="r">${i.discount ? formatINR2(i.discount) : "—"}</td>
<td class="r">${formatINR2(taxable)}</td>
<td class="r">${i.tax_rate}%</td>
${intra ? `<td class="r">${formatINR2(half)}</td><td class="r">${formatINR2(round2(i.tax_amount - half))}</td>` : `<td class="r">${formatINR2(i.tax_amount)}</td>`}
<td class="r">${formatINR2(i.line_total)}</td></tr>`;
    })
    .join("");

  const fees = round2(o.shipping_total + o.cod_fee);
  const itemsTax = round2(o.items.reduce((t, i) => t + i.tax_amount, 0));
  const feeTax = round2(o.tax_total - itemsTax);
  const feeTaxable = round2(inclusive ? fees - feeTax : fees);
  const feeRow = fees
    ? `<tr><td></td><td>Shipping${o.cod_fee ? " & COD charges" : ""}</td><td>996812</td><td class="r">1</td><td class="r">${formatINR2(fees)}</td><td class="r">—</td><td class="r">${formatINR2(feeTaxable)}</td><td class="r">${fees ? Math.round((feeTax / Math.max(feeTaxable, 0.01)) * 100) : 0}%</td>
${intra ? `<td class="r">${formatINR2(round2(feeTax / 2))}</td><td class="r">${formatINR2(round2(feeTax - round2(feeTax / 2)))}</td>` : `<td class="r">${formatINR2(feeTax)}</td>`}<td class="r">${formatINR2(inclusive ? fees : fees + feeTax)}</td></tr>`
    : "";

  const cols = intra ? 11 : 10;
  const title = s.gstin ? "Tax Invoice" : "Invoice";
  return `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} ${esc(o.invoice_number ?? o.order_number)}</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#1c120c;margin:0;background:#f2ebe4;font-size:13px}
.page{max-width:900px;margin:24px auto;background:#fff;padding:36px;border-radius:12px}
h1{font-size:22px;margin:0;letter-spacing:.02em}.brand{font-weight:800;letter-spacing:.08em}.brand span{color:#ff6a13}
.top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #1c120c;padding-bottom:16px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0}.box h3{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6b5d53;margin:0 0 6px}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #e9dfd6;padding:6px 7px;text-align:left;vertical-align:top}th{background:#faf6f2;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.r{text-align:right;white-space:nowrap}.m{color:#6b5d53;font-size:11px}.tot td{font-weight:700}.meta td{border:0;padding:2px 0}
.foot{margin-top:24px;display:flex;justify-content:space-between;gap:24px;font-size:12px;color:#5c4f46}
.actions{max-width:900px;margin:16px auto 0;display:flex;gap:8px;justify-content:flex-end}
.actions button{background:#1c120c;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-weight:600;cursor:pointer}
@media print{body{background:#fff}.page{margin:0;padding:0;border-radius:0}.actions{display:none}}
@media (max-width:640px){.page{padding:18px;margin:0}.grid,.top{display:block}.tbl{overflow-x:auto}}
</style></head><body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="page">
<div class="top"><div><div class="brand">3D PRINT<span>MONK</span></div><div style="margin-top:8px"><strong>${esc(s.legalName || s.name)}</strong><br>${esc(s.addressLine)}<br>${esc(s.city)}, ${esc(s.state)} ${esc(s.pincode)}<br>${s.gstin ? `GSTIN: <strong>${esc(s.gstin)}</strong><br>` : ""}${s.pan ? `PAN: ${esc(s.pan)}<br>` : ""}${esc(s.supportEmail || s.email)}${s.phone ? ` · ${esc(s.phone)}` : ""}</div></div>
<div style="text-align:right"><h1>${esc(title)}</h1><table class="meta" style="width:auto;margin-left:auto"><tr><td>Invoice no.</td><td class="r"><strong>${esc(o.invoice_number ?? "Pending")}</strong></td></tr>
<tr><td>Invoice date</td><td class="r">${esc(new Date(o.invoice_date ?? o.paid_at ?? o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))}</td></tr>
<tr><td>Order no.</td><td class="r">${esc(o.order_number)}</td></tr><tr><td>Order date</td><td class="r">${esc(new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))}</td></tr>
<tr><td>Payment</td><td class="r">${o.payment_method === "cod" ? "Cash on delivery" : "Prepaid (online)"}</td></tr></table></div></div>
<div class="grid"><div class="box"><h3>Bill to</h3><strong>${esc(o.business_name || b.fullName)}</strong><br>${o.business_name ? `${esc(b.fullName)}<br>` : ""}${esc(b.line1)}${b.line2 ? `, ${esc(b.line2)}` : ""}<br>${esc(b.city)}, ${esc(b.state)} ${esc(b.pincode)}<br>${esc(b.phone)}${o.gstin ? `<br>GSTIN: <strong>${esc(o.gstin)}</strong>` : ""}</div>
<div class="box"><h3>Ship to</h3><strong>${esc(sh.fullName)}</strong><br>${esc(sh.line1)}${sh.line2 ? `, ${esc(sh.line2)}` : ""}<br>${esc(sh.city)}, ${esc(sh.state)} ${esc(sh.pincode)}<br>${esc(sh.phone)}<br><span class="m">Place of supply: ${esc(pos)}</span></div></div>
<div class="tbl"><table><thead><tr><th>#</th><th>Item</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Disc.</th><th class="r">Taxable</th><th class="r">GST</th>${intra ? `<th class="r">CGST</th><th class="r">SGST</th>` : `<th class="r">IGST</th>`}<th class="r">Amount</th></tr></thead>
<tbody>${rows}${feeRow}</tbody>
<tfoot><tr class="tot"><td colspan="${cols - 1}" class="r">Total taxable value</td><td class="r">${formatINR2(o.tax_breakdown?.taxableValue ?? o.grand_total - o.tax_total)}</td></tr>
${intra ? `<tr><td colspan="${cols - 1}" class="r">CGST</td><td class="r">${formatINR2(o.tax_breakdown?.cgst ?? o.tax_total / 2)}</td></tr><tr><td colspan="${cols - 1}" class="r">SGST</td><td class="r">${formatINR2(o.tax_breakdown?.sgst ?? o.tax_total / 2)}</td></tr>` : `<tr><td colspan="${cols - 1}" class="r">IGST</td><td class="r">${formatINR2(o.tax_breakdown?.igst ?? o.tax_total)}</td></tr>`}
<tr class="tot"><td colspan="${cols - 1}" class="r">Grand total</td><td class="r">${formatINR2(o.grand_total)}</td></tr></tfoot></table></div>
<p><strong>Amount in words:</strong> ${esc(amountInWords(o.grand_total))}</p>
${o.coupon_code ? `<p class="m">Coupon applied: ${esc(o.coupon_code)} (discount ${formatINR2(o.discount_total)}).</p>` : ""}
<p class="m">${inclusive ? "Prices are inclusive of GST." : "GST charged in addition to listed prices."} Whether tax is payable on reverse charge: No.</p>
<div class="foot"><div>This is a computer-generated invoice and does not require a signature.</div><div style="text-align:right">For ${esc(s.legalName || s.name)}<br><br>Authorised signatory</div></div>
</div></body></html>`;
}
