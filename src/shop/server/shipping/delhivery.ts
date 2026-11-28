import "server-only";
import { shopEnv } from "../env";

/**
 * Delhivery tracking (B2C "Track shipment" API).
 *   GET {DELHIVERY_API_BASE}/api/v1/packages/json/?waybill=AWB1,AWB2
 *   Authorization: Token {DELHIVERY_API_TOKEN}
 * Production base: https://track.delhivery.com · Staging: https://staging-express.delhivery.com
 * The token is in the Delhivery One panel → Settings → API setup.
 */

export type TrackingScan = { status: string; location: string | null; at: string | null; instructions: string | null; type: string | null };
export type TrackingResult = {
  awb: string;
  status: string; // courier's wording
  statusType: string | null; // UD (in progress), DL (delivered), RT (return), PU (pickup), CN (cancelled)
  location: string | null;
  at: string | null; // ISO
  expectedDelivery: string | null; // YYYY-MM-DD
  origin: string | null;
  destination: string | null;
  scans: TrackingScan[]; // oldest → newest
};

/** Delhivery sends IST wall-clock times without an offset ("2026-11-27T10:15:00.000"). */
export function istToIso(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim().replace(" ", "T");
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}+05:30`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);

type RawShipment = {
  AWB?: unknown; Status?: { Status?: unknown; StatusLocation?: unknown; StatusDateTime?: unknown; StatusType?: unknown; Instructions?: unknown };
  Scans?: { ScanDetail?: { Scan?: unknown; ScanDateTime?: unknown; StatusDateTime?: unknown; ScannedLocation?: unknown; Instructions?: unknown; ScanType?: unknown } }[];
  ExpectedDeliveryDate?: unknown; PromisedDeliveryDate?: unknown; Origin?: unknown; Destination?: unknown;
};

/** Parses a tracking response or a push-webhook body ({ Shipment } or { ShipmentData: [{ Shipment }] }). Tolerant of missing fields. */
export function parseTracking(body: unknown): TrackingResult[] {
  const b = body as { ShipmentData?: { Shipment?: RawShipment }[]; Shipment?: RawShipment } | null;
  const list: RawShipment[] = Array.isArray(b?.ShipmentData) ? b!.ShipmentData.map((x) => x?.Shipment).filter(Boolean) as RawShipment[] : b?.Shipment ? [b.Shipment] : [];
  const out: TrackingResult[] = [];
  for (const s of list) {
    const awb = str(String(s.AWB ?? ""));
    if (!awb) continue;
    const scans: TrackingScan[] = (Array.isArray(s.Scans) ? s.Scans : [])
      .map((x) => x?.ScanDetail)
      .filter(Boolean)
      .map((d) => ({ status: str(d!.Scan) ?? "Update", location: str(d!.ScannedLocation), at: istToIso(d!.ScanDateTime ?? d!.StatusDateTime), instructions: str(d!.Instructions), type: str(d!.ScanType) }))
      .sort((a, b2) => (a.at ?? "").localeCompare(b2.at ?? ""))
      .slice(-100);
    const exp = istToIso(s.ExpectedDeliveryDate ?? s.PromisedDeliveryDate);
    out.push({
      awb,
      status: str(s.Status?.Status) ?? scans.at(-1)?.status ?? "Unknown",
      statusType: str(s.Status?.StatusType)?.toUpperCase() ?? null,
      location: str(s.Status?.StatusLocation) ?? scans.at(-1)?.location ?? null,
      at: istToIso(s.Status?.StatusDateTime) ?? scans.at(-1)?.at ?? null,
      expectedDelivery: exp ? exp.slice(0, 10) : null,
      origin: str(s.Origin),
      destination: str(s.Destination),
      scans,
    });
  }
  return out;
}

export type ShipmentStatus = "pending" | "packed" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "returned" | "cancelled";

/** Maps Delhivery's status to our shipment lifecycle. */
export function mapDelhiveryStatus(r: Pick<TrackingResult, "status" | "statusType">): ShipmentStatus {
  const s = r.status.toLowerCase();
  const t = (r.statusType ?? "").toUpperCase();
  if (t === "DL" || s === "delivered") return "delivered";
  if (t === "RT" || s.includes("rto") || s.includes("return")) return "returned";
  if (t === "CN" || s.includes("cancel")) return "cancelled";
  if (s.includes("out for delivery") || s === "dispatched") return "out_for_delivery";
  if (s.includes("manifest") || s.includes("not picked") || s === "open" || s.includes("pickup scheduled")) return "packed";
  return "in_transit"; // In Transit, Pending, Picked Up, Reached hub …
}

export async function trackAwbs(awbs: string[]): Promise<TrackingResult[]> {
  const clean = [...new Set(awbs.map((a) => a.trim()).filter((a) => /^[A-Za-z0-9-]{6,40}$/.test(a)))];
  if (!clean.length) return [];
  const results: TrackingResult[] = [];
  for (let i = 0; i < clean.length; i += 50) {
    const batch = clean.slice(i, i + 50);
    const res = await fetch(`${shopEnv.delhivery.apiBase}/api/v1/packages/json/?waybill=${encodeURIComponent(batch.join(","))}`, {
      headers: { Authorization: `Token ${shopEnv.delhivery.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Delhivery tracking failed (${res.status}): ${(body as { Error?: string; detail?: string } | null)?.Error ?? (body as { detail?: string } | null)?.detail ?? "no details"}`);
    results.push(...parseTracking(body));
  }
  return results;
}

export const delhiveryTrackingPage = (awb: string) => `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`;
