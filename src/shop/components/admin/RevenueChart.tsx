"use client";

import { useState } from "react";
import { formatINR } from "@/shop/lib/money";

/**
 * Revenue per day — single series column chart. Columns ≤24px with 4px rounded tops
 * from one baseline, hairline gridlines, clean rounded ticks, per-column hover
 * tooltip with a hit target taller than the mark, and a data table for screen
 * readers / exact values. Bar colour validated for contrast on white (#e8590c).
 */
type Point = { day: string; revenue: number; orders: number };

const BAR = "#e8590c";
const GRID = "#ece4dc";
const INK = "#5c4f46";

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const tick = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-IN"));
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760;
  const H = 260;
  const pad = { l: 52, r: 12, t: 16, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.revenue)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const band = iw / Math.max(1, data.length);
  const bw = Math.min(24, Math.max(2, band - 2));
  const labelEvery = Math.ceil(data.length / 8);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Revenue by day, ${data.length} days`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={INK}>{tick(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * band + (band - bw) / 2;
          const top = y(d.revenue);
          const bh = pad.t + ih - top;
          const r = Math.min(4, bh, bw / 2);
          return (
            <g key={d.day}>
              {bh > 0 && (
                <path
                  d={`M${x},${pad.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.t + ih} Z`}
                  fill={BAR}
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {i % labelEvery === 0 && <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize={11} fill={INK}>{dayLabel(d.day)}</text>}
              <rect x={pad.l + i * band} y={pad.t} width={band} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="#cfc3b8" strokeWidth={1} />
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((pad.l + hover * band + band / 2) / W) * 100}%`, top: 0 }}
        >
          <p className="font-semibold text-text">{dayLabel(h.day)}</p>
          <p className="text-muted">{formatINR(h.revenue)} · {h.orders} order{h.orders === 1 ? "" : "s"}</p>
        </div>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr className="text-muted"><th className="py-1">Day</th><th className="py-1 text-right">Revenue</th><th className="py-1 text-right">Orders</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day} className="border-t border-line"><td className="py-1">{dayLabel(d.day)}</td><td className="py-1 text-right">{formatINR(d.revenue)}</td><td className="py-1 text-right">{d.orders}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
