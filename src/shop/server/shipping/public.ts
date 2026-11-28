import "server-only";
import { isHttpsUrl } from "@/shop/lib/url";
import type { ShipmentRow } from "../orders";

/** Shipment data safe to send to the customer's browser (no internal ids or error details). */
export function publicShipments(rows: ShipmentRow[]) {
  return rows.map((s) => ({
    carrier: s.carrier,
    awb: s.tracking_number,
    url: s.tracking_url && isHttpsUrl(s.tracking_url) ? s.tracking_url : null,
    status: s.status,
    lastStatus: s.last_status,
    lastLocation: s.last_location,
    lastEventAt: s.last_event_at,
    expectedDelivery: s.expected_delivery,
    shippedAt: s.shipped_at,
    deliveredAt: s.delivered_at,
    syncedAt: s.last_synced_at,
    events: (s.events ?? []).slice(-100),
  }));
}
export type PublicShipment = ReturnType<typeof publicShipments>[number];
