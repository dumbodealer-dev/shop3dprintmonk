import "server-only";
import { PINCODE_RE } from "@/shop/lib/india";
import type { ShippingMethod, ShopSettings } from "@/shop/lib/settings-schema";
import { shopIntegrations } from "../env";
import * as shiprocket from "./shiprocket";

/**
 * Shipping rules come from Admin → Settings → Shipping. Shipments are managed
 * manually by default (carrier + tracking number entered in the admin). When
 * Shiprocket credentials are configured and the provider is set to "shiprocket",
 * serviceability checks and shipment creation use its API instead.
 */

export type Serviceability = { serviceable: boolean; local: boolean; message: string; cod: boolean };

export async function checkPincode(pincode: string, settings: ShopSettings): Promise<Serviceability> {
  const s = settings.shipping;
  if (!PINCODE_RE.test(pincode)) return { serviceable: false, local: false, cod: false, message: "Enter a valid 6-digit PIN code." };
  if (s.blockedPincodes.includes(pincode) || (s.serviceablePrefixes.length && !s.serviceablePrefixes.some((p) => pincode.startsWith(p))))
    return { serviceable: false, local: false, cod: false, message: "Sorry, we don't deliver to this PIN code yet. Contact us for alternatives." };
  const local = s.localPrefixes.some((p) => pincode.startsWith(p));

  if (s.provider === "shiprocket" && shopIntegrations.shiprocket) {
    const r = await shiprocket.serviceability(pincode).catch((e) => {
      console.error("[shop] shiprocket serviceability failed:", e);
      return null;
    });
    if (r && !r.serviceable) return { serviceable: false, local, cod: false, message: "Our courier partners don't serve this PIN code yet." };
    if (r) return { serviceable: true, local, cod: r.cod && settings.payments.codEnabled, message: local ? "Delivers fast in Delhi NCR" : "Delivery available" };
  }
  return { serviceable: true, local, cod: settings.payments.codEnabled, message: local ? "Delivers fast in Delhi NCR" : "Delivery available across India" };
}

export const enabledMethods = (settings: ShopSettings) => settings.shipping.methods.filter((m) => m.enabled);

export function findMethod(settings: ShopSettings, id: string | null | undefined): ShippingMethod {
  const methods = enabledMethods(settings);
  return methods.find((m) => m.id === id) ?? methods[0] ?? settings.shipping.methods[0];
}

/** Business-day estimate: processing + product lead time + transit (Sundays skipped). */
export function deliveryEstimate(method: ShippingMethod, settings: ShopSettings, opts: { leadDays?: number; local?: boolean; from?: Date } = {}) {
  const prep = settings.shipping.processingDays + (opts.leadDays ?? 0);
  const maxTransit = opts.local ? Math.min(method.maxDays, settings.shipping.localMaxDays) : method.maxDays;
  const minTransit = Math.min(method.minDays, maxTransit);
  const start = opts.from ?? new Date();
  return { from: addBusinessDays(start, prep + minTransit), to: addBusinessDays(start, prep + maxTransit) };
}

function addBusinessDays(d: Date, days: number) {
  const out = new Date(d);
  let left = days;
  while (left > 0) {
    out.setDate(out.getDate() + 1);
    if (out.getDay() !== 0) left--;
  }
  return out;
}

export const formatEta = (e: { from: Date; to: Date }) => {
  const f = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return e.from.toDateString() === e.to.toDateString() ? f.format(e.to) : `${f.format(e.from)} – ${f.format(e.to)}`;
};

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Courier tracking links for common Indian carriers (used when the admin enters a tracking number manually). */
export function trackingUrl(carrier: string | null, awb: string | null): string | null {
  if (!awb) return null;
  const c = (carrier ?? "").toLowerCase();
  const n = encodeURIComponent(awb);
  if (c.includes("delhivery")) return `https://www.delhivery.com/track/package/${n}`;
  if (c.includes("blue")) return `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${n}`;
  if (c.includes("dtdc")) return `https://www.dtdc.in/tracking.asp?strCnno=${n}`;
  if (c.includes("india post") || c.includes("speed post")) return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  if (c.includes("xpress")) return `https://www.xpressbees.com/shipment/tracking?awbNo=${n}`;
  if (c.includes("ekart")) return `https://ekartlogistics.com/shipmenttrack/${n}`;
  if (c.includes("shiprocket")) return `https://shiprocket.co/tracking/${n}`;
  return null;
}

export { shiprocket };
