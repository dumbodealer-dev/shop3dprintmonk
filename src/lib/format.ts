import { business } from "@/config/business";

export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return e164;
}

export function formatAddress(): string | null {
  const a = business.address;
  if (!a.verified || !a.street) return null;
  return [a.street, a.locality, `${a.city}${a.postalCode ? ` ${a.postalCode}` : ""}`, "India"].filter(Boolean).join(", ");
}

export const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
