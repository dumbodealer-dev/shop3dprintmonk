"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, MapPin, Package, RefreshCw, Truck } from "lucide-react";
import type { PublicShipment } from "@/shop/server/shipping/public";
import { api, ApiError } from "../api";

const STEPS = [
  { key: "packed", label: "Packed" },
  { key: "in_transit", label: "In transit" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const;
const RANK: Record<string, number> = { pending: 0, packed: 0, shipped: 1, in_transit: 1, out_for_delivery: 2, delivered: 3 };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
const day = (d: string | null) => (d ? new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : null);
/** "Delhi_Hub (Delhi)" → "Delhi Hub (Delhi)" */
const place = (s: string | null) => s?.replace(/_/g, " ") ?? null;

export function TrackingPanel({ initial, orderNumber, accessKey, canRefresh = true }: { initial: PublicShipment[]; orderNumber: string; accessKey: string | null; canRefresh?: boolean }) {
  const [shipments, setShipments] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!shipments.length) return null;
  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ shipments: PublicShipment[] }>("/account/orders/track", { body: { orderNumber, key: accessKey } });
      setShipments(r.shipments);
      setMsg("Tracking is up to date.");
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't refresh tracking right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="tracking-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tracking-h" className="flex items-center gap-2 text-lg font-bold"><Truck className="h-5 w-5 text-accent-ink" /> Shipment tracking</h2>
        {canRefresh && (
          <button type="button" onClick={refresh} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-paper disabled:opacity-60">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-muted" role="status">{msg}</p>}
      <div className="mt-5 space-y-8">
        {shipments.map((s, i) => <ShipmentCard key={s.awb ?? i} s={s} index={shipments.length > 1 ? i + 1 : null} />)}
      </div>
    </section>
  );
}

function ShipmentCard({ s, index }: { s: PublicShipment; index: number | null }) {
  const [copied, setCopied] = useState(false);
  const [all, setAll] = useState(false);
  const rank = RANK[s.status] ?? 0;
  const special = s.status === "returned" ? "Returning to sender" : s.status === "cancelled" ? "Shipment cancelled" : null;
  const events = [...s.events].reverse();
  const shown = all ? events : events.slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-accent-ink" /> {index ? `Parcel ${index} · ` : ""}{s.carrier ?? "Courier"}</span>
        {s.awb && (
          <button type="button" onClick={() => { navigator.clipboard?.writeText(s.awb!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {}); }} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 font-mono text-xs hover:bg-paper-2" aria-label={`Copy tracking number ${s.awb}`}>
            AWB {s.awb} {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline">Track on {s.carrier ?? "courier"} site <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>

      {special ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">{special}{s.lastStatus ? ` — ${s.lastStatus}` : ""}. We&apos;ll contact you about next steps.</p>
      ) : (
        <ol className="mt-5 grid grid-cols-4 gap-1" aria-label="Delivery progress">
          {STEPS.map((step, n) => {
            const done = n <= rank && (n > 0 || s.status !== "pending");
            return (
              <li key={step.key} className="flex flex-col items-center text-center">
                <span className={`h-1.5 w-full rounded-full ${done ? "bg-accent" : "bg-paper-2"}`} />
                <span className={`mt-2 text-[0.7rem] sm:text-xs ${done ? "font-semibold text-text" : "text-muted"}`}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-5 grid gap-3 rounded-xl bg-paper p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Latest update</p>
          <p className="mt-0.5 font-semibold">{s.lastStatus ?? (s.status === "pending" || s.status === "packed" ? "Preparing for dispatch" : s.status.replace(/_/g, " "))}</p>
          {s.lastEventAt && <p className="text-xs text-muted">{when(s.lastEventAt)}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Location</p>
          <p className="mt-0.5 flex items-start gap-1 font-semibold"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />{place(s.lastLocation) ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{s.status === "delivered" ? "Delivered" : "Expected delivery"}</p>
          <p className="mt-0.5 font-semibold">{s.status === "delivered" ? when(s.deliveredAt) || "Delivered" : day(s.expectedDelivery) ?? "Updates once picked up"}</p>
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-bold">Journey</h3>
          <ol className="mt-3 space-y-0">
            {shown.map((e, n) => (
              <li key={`${e.at}-${n}`} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="relative flex flex-col items-center">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${n === 0 ? "bg-accent ring-4 ring-accent/20" : "bg-ink-300"}`} />
                  {n < shown.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className={n === 0 ? "font-semibold" : ""}>{e.instructions ?? e.status}</p>
                  <p className="text-xs text-muted">{[e.instructions && e.status !== e.instructions ? e.status : null, place(e.location), when(e.at)].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
          {events.length > 5 && (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-semibold text-accent-ink hover:underline">
              {all ? "Show less" : `Show all ${events.length} updates`}
            </button>
          )}
        </div>
      )}
      {s.syncedAt && <p className="mt-3 text-xs text-muted">Last checked {when(s.syncedAt)}</p>}
    </div>
  );
}
