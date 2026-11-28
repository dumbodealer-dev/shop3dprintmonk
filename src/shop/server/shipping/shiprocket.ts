import "server-only";
import { shopEnv } from "../env";

/**
 * Shiprocket adapter (https://apidocs.shiprocket.in). Used only when
 * SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are set and Admin → Settings →
 * Shipping → provider is "shiprocket". Requires an API user created in
 * Shiprocket → Settings → API, and a pickup location matching SHIPROCKET_PICKUP_LOCATION.
 */
let cached: { token: string; expires: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.token;
  const res = await fetch(`${shopEnv.shiprocket.apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: shopEnv.shiprocket.email, password: shopEnv.shiprocket.password }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!res.ok || !data.token) throw new Error(`Shiprocket login failed: ${data.message ?? res.status}`);
  cached = { token: data.token, expires: Date.now() + 8 * 86_400_000 }; // tokens last 10 days
  return data.token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${shopEnv.shiprocket.apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Shiprocket ${path} failed: ${data.message ?? res.status}`);
  return data;
}

export async function serviceability(deliveryPincode: string, weightKg = 0.5) {
  const q = new URLSearchParams({ pickup_postcode: shopEnv.shiprocket.pickupPincode, delivery_postcode: deliveryPincode, weight: String(weightKg), cod: "1" });
  const data = await call<{ data?: { available_courier_companies?: { cod: number; estimated_delivery_days: string }[] } }>(`/courier/serviceability/?${q}`);
  const couriers = data.data?.available_courier_companies ?? [];
  return { serviceable: couriers.length > 0, cod: couriers.some((c) => c.cod === 1) };
}

export type ShipmentOrder = {
  orderNumber: string;
  createdAt: string;
  paymentMethod: "razorpay" | "cod";
  grandTotal: number;
  address: { fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string };
  email: string;
  items: { name: string; sku: string | null; quantity: number; unitPrice: number; hsn: string | null }[];
  weightKg: number;
  dimsCm: { l: number; b: number; h: number };
};

/** Creates the order in Shiprocket and requests an AWB. Returns tracking details. */
export async function createShipment(o: ShipmentOrder) {
  const [first, ...rest] = o.address.fullName.split(" ");
  const created = await call<{ order_id: number; shipment_id: number }>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify({
      order_id: o.orderNumber,
      order_date: o.createdAt.slice(0, 16).replace("T", " "),
      pickup_location: shopEnv.shiprocket.pickupLocation,
      billing_customer_name: first,
      billing_last_name: rest.join(" "),
      billing_address: o.address.line1,
      billing_address_2: o.address.line2 ?? "",
      billing_city: o.address.city,
      billing_pincode: o.address.pincode,
      billing_state: o.address.state,
      billing_country: "India",
      billing_email: o.email,
      billing_phone: o.address.phone.replace(/^\+91/, ""),
      shipping_is_billing: true,
      order_items: o.items.map((i) => ({ name: i.name, sku: i.sku ?? i.name.slice(0, 40), units: i.quantity, selling_price: i.unitPrice, hsn: i.hsn ?? "" })),
      payment_method: o.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: o.grandTotal,
      length: o.dimsCm.l,
      breadth: o.dimsCm.b,
      height: o.dimsCm.h,
      weight: o.weightKg,
    }),
  });
  const awb = await call<{ response?: { data?: { awb_code?: string; courier_name?: string } } }>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: created.shipment_id }),
  });
  return {
    providerRef: String(created.shipment_id),
    trackingNumber: awb.response?.data?.awb_code ?? null,
    carrier: awb.response?.data?.courier_name ?? "Shiprocket",
  };
}

export async function track(awb: string) {
  const data = await call<{ tracking_data?: { shipment_track?: { current_status?: string }[]; track_url?: string } }>(`/courier/track/awb/${encodeURIComponent(awb)}`);
  return { status: data.tracking_data?.shipment_track?.[0]?.current_status ?? null, url: data.tracking_data?.track_url ?? null };
}
