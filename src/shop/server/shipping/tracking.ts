import "server-only";
import { db } from "../db";
import { shopIntegrations } from "../env";
import { addEvent, getOrderById, updateOrderStatus } from "../orders";
import { delhiveryTrackingPage, mapDelhiveryStatus, trackAwbs, type ShipmentStatus, type TrackingResult } from "./delhivery";

/**
 * Keeps Delhivery shipments up to date and moves orders along automatically:
 *   picked up / in transit  → order "Shipped" (customer gets the shipped email)
 *   delivered               → order "Delivered" (delivered email; COD marked paid + invoice)
 *   returned to origin (RTO)→ order flagged for review
 * Runs from the 15-minute cron, when a customer opens/refreshes tracking, when an
 * admin saves a Delhivery AWB, and when Delhivery pushes a scan webhook.
 */

const FINAL: ShipmentStatus[] = ["delivered", "returned", "cancelled"];
const isDelhivery = (s: { provider: string | null; carrier: string | null }) => s.provider === "delhivery" || /delhivery/i.test(s.carrier ?? "");

type ShipmentRow = { id: string; order_id: string; provider: string; carrier: string | null; tracking_number: string | null; status: string; shipped_at: string | null; delivered_at: string | null; last_synced_at: string | null; last_status: string | null };
const COLS = "id, order_id, provider, carrier, tracking_number, status, shipped_at, delivered_at, last_synced_at, last_status";

async function apply(row: ShipmentRow, r: TrackingResult) {
  const status = mapDelhiveryStatus(r);
  const changed = r.status !== row.last_status || status !== row.status;
  await db()
    .from("shop_shipments")
    .update({
      provider: "delhivery",
      carrier: row.carrier ?? "Delhivery",
      status,
      last_status: r.status,
      last_status_type: r.statusType,
      last_location: r.location,
      last_event_at: r.at,
      expected_delivery: r.expectedDelivery,
      events: r.scans,
      tracking_url: delhiveryTrackingPage(r.awb),
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      ...(["in_transit", "out_for_delivery", "delivered"].includes(status) && !row.shipped_at ? { shipped_at: r.scans.find((s) => /picked|transit/i.test(s.status))?.at ?? r.at ?? new Date().toISOString() } : {}),
      ...(status === "delivered" && !row.delivered_at ? { delivered_at: r.at ?? new Date().toISOString() } : {}),
    })
    .eq("id", row.id);
  if (!changed) return;

  const order = await getOrderById(row.order_id);
  if (!order || ["cancelled", "refunded"].includes(order.status)) return;
  const actor = "system:delhivery";
  try {
    if (["in_transit", "out_for_delivery", "delivered"].includes(status) && ["payment_confirmed", "processing", "ready_for_shipment"].includes(order.status)) {
      await updateOrderStatus(order.id, "shipped", actor, `Picked up by Delhivery (AWB ${r.awb})`);
    }
    if (status === "out_for_delivery" && row.status !== "out_for_delivery") {
      await addEvent(order.id, { note: `Out for delivery${r.location ? ` — ${r.location}` : ""}`, actor });
    }
    if (status === "delivered") {
      const fresh = await getOrderById(order.id);
      if (fresh?.status === "shipped") await updateOrderStatus(order.id, "delivered", actor, `Delivered${r.location ? ` — ${r.location}` : ""}`);
    }
    if (status === "returned" && row.status !== "returned") {
      await db().from("shop_orders").update({ needs_review: true }).eq("id", order.id);
      await addEvent(order.id, { note: `Delhivery: ${r.status} (AWB ${r.awb}) — shipment is returning to origin`, actor, visible: true });
    }
  } catch (e) {
    console.error(`[shop] tracking → order update failed for ${order.order_number}:`, e);
  }
}

/** Fetches and applies tracking for the given shipments (Delhivery only). Returns how many were updated. */
export async function syncShipments(rows: ShipmentRow[]): Promise<{ updated: number; errors: number }> {
  const eligible = rows.filter((r) => r.tracking_number && isDelhivery(r));
  if (!eligible.length || !shopIntegrations.delhivery) return { updated: 0, errors: 0 };
  let results: TrackingResult[];
  try {
    results = await trackAwbs(eligible.map((r) => r.tracking_number!));
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : "tracking failed";
    console.error("[shop] Delhivery sync failed:", msg);
    await db().from("shop_shipments").update({ sync_error: msg, last_synced_at: new Date().toISOString() }).in("id", eligible.map((r) => r.id));
    return { updated: 0, errors: eligible.length };
  }
  const byAwb = new Map(results.map((r) => [r.awb.toUpperCase(), r]));
  let updated = 0;
  let errors = 0;
  for (const row of eligible) {
    const r = byAwb.get(row.tracking_number!.trim().toUpperCase());
    if (!r) {
      errors++;
      await db().from("shop_shipments").update({ sync_error: "AWB not found at Delhivery yet", last_synced_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }
    await apply(row, r);
    updated++;
  }
  return { updated, errors };
}

/** Cron: every open Delhivery shipment (oldest sync first, capped per run). */
export async function syncActiveDelhivery(limit = 200) {
  if (!shopIntegrations.delhivery) return { updated: 0, errors: 0, skipped: "DELHIVERY_API_TOKEN not set" };
  const { data } = await db()
    .from("shop_shipments")
    .select(COLS)
    .not("tracking_number", "is", null)
    .not("status", "in", `(${FINAL.join(",")})`)
    .or("provider.eq.delhivery,carrier.ilike.*delhivery*")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  return syncShipments((data ?? []) as ShipmentRow[]);
}

/** One order's shipments; skipped if synced within `maxAgeMinutes` (protects the courier API from refresh spam). */
export async function syncOrderTracking(orderId: string, maxAgeMinutes = 10) {
  const { data } = await db().from("shop_shipments").select(COLS).eq("order_id", orderId);
  const rows = ((data ?? []) as ShipmentRow[]).filter((r) => !FINAL.includes(r.status as ShipmentStatus) && (!r.last_synced_at || Date.now() - Date.parse(r.last_synced_at) > maxAgeMinutes * 60_000));
  return syncShipments(rows);
}

/** Webhook / admin: sync specific AWBs (only ones that belong to our shipments). */
export async function syncByAwbs(awbs: string[]) {
  const list = [...new Set(awbs.map((a) => a.trim()).filter((a) => /^[A-Za-z0-9-]{6,40}$/.test(a)))].slice(0, 50);
  if (!list.length) return { updated: 0, errors: 0 };
  const { data } = await db().from("shop_shipments").select(COLS).in("tracking_number", list);
  return syncShipments((data ?? []) as ShipmentRow[]);
}

/** Applies a pushed payload directly (used only when no API token is configured to re-fetch). */
export async function applyPushedResults(results: TrackingResult[]) {
  const awbs = results.map((r) => r.awb);
  const { data } = await db().from("shop_shipments").select(COLS).in("tracking_number", awbs);
  let updated = 0;
  for (const row of (data ?? []) as ShipmentRow[]) {
    const r = results.find((x) => x.awb.toUpperCase() === row.tracking_number?.toUpperCase());
    if (r && isDelhivery(row)) {
      await apply(row, r);
      updated++;
    }
  }
  return { updated };
}
