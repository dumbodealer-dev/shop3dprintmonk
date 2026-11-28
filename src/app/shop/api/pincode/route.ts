import { checkPincode, deliveryEstimate, enabledMethods, formatEta } from "@/shop/server/shipping";
import { getSettings } from "@/shop/server/settings";
import { json, route } from "@/shop/server/http";

/** PIN code serviceability + delivery estimate (product page and checkout). */
export const GET = route(
  async (req) => {
    const url = new URL(req.url);
    const pin = (url.searchParams.get("pin") ?? "").trim();
    const lead = Math.min(30, Math.max(0, Number(url.searchParams.get("lead")) || 0));
    const settings = await getSettings();
    const r = await checkPincode(pin, settings);
    if (!r.serviceable) return json({ ...r, options: [] });
    const options = enabledMethods(settings).map((m) => ({ id: m.id, label: m.label, eta: formatEta(deliveryEstimate(m, settings, { leadDays: lead, local: r.local })) }));
    return json({ ...r, options });
  },
  { rate: ["pincode", 60, 60_000] },
);
