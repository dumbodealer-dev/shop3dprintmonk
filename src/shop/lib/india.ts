/** India-specific validation and reference data (states, PIN codes, mobile numbers, GSTIN). */

export const INDIAN_STATES = [
  { code: "35", name: "Andaman and Nicobar Islands" }, { code: "37", name: "Andhra Pradesh" }, { code: "12", name: "Arunachal Pradesh" },
  { code: "18", name: "Assam" }, { code: "10", name: "Bihar" }, { code: "04", name: "Chandigarh" }, { code: "22", name: "Chhattisgarh" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" }, { code: "07", name: "Delhi" }, { code: "30", name: "Goa" },
  { code: "24", name: "Gujarat" }, { code: "06", name: "Haryana" }, { code: "02", name: "Himachal Pradesh" }, { code: "01", name: "Jammu and Kashmir" },
  { code: "20", name: "Jharkhand" }, { code: "29", name: "Karnataka" }, { code: "32", name: "Kerala" }, { code: "38", name: "Ladakh" },
  { code: "31", name: "Lakshadweep" }, { code: "23", name: "Madhya Pradesh" }, { code: "27", name: "Maharashtra" }, { code: "14", name: "Manipur" },
  { code: "17", name: "Meghalaya" }, { code: "15", name: "Mizoram" }, { code: "13", name: "Nagaland" }, { code: "21", name: "Odisha" },
  { code: "34", name: "Puducherry" }, { code: "03", name: "Punjab" }, { code: "08", name: "Rajasthan" }, { code: "11", name: "Sikkim" },
  { code: "33", name: "Tamil Nadu" }, { code: "36", name: "Telangana" }, { code: "16", name: "Tripura" }, { code: "09", name: "Uttar Pradesh" },
  { code: "05", name: "Uttarakhand" }, { code: "19", name: "West Bengal" },
] as const;

export const STATE_NAMES = INDIAN_STATES.map((s) => s.name) as unknown as [string, ...string[]];
export const stateCode = (name: string) => INDIAN_STATES.find((s) => s.name.toLowerCase() === name.trim().toLowerCase())?.code ?? null;

/** 6 digits, first digit 1–9. */
export const PINCODE_RE = /^[1-9][0-9]{5}$/;

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6–9. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Structure + check digit validation of a 15-character GSTIN. */
export function isValidGstin(raw: string): boolean {
  const g = raw.trim().toUpperCase();
  if (!/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = GSTIN_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === g[14];
}
export const gstinStateCode = (gstin: string) => gstin.trim().slice(0, 2);
