"use client";

import { useEffect, useRef } from "react";
import { Calculator, ClipboardList, Info, Sparkles } from "lucide-react";
import type { Estimate, EstimateLine } from "@/lib/pricing/estimate";
import { pricingRules } from "@/config/pricing";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const g = (n: number) => `≈ ${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })} g`;

/** Compact stat tile — values wrap inside the tile, never off the edge. */
function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-ink-900/70 px-3 py-2">
      <dt className="truncate text-[0.7rem] text-ink-400">{label}</dt>
      <dd className={`mt-0.5 break-words font-mono text-sm tabular-nums ${strong ? "font-semibold text-white" : "text-ink-200"}`}>{value}</dd>
    </div>
  );
}

/**
 * Customer-facing figures only. Support material is calculated and included in
 * the grams and price, but deliberately not shown as a separate item.
 */
function SelectedFile({ line, showPrices }: { line: EstimateLine; showPrices: boolean }) {
  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-ink-850/80 p-3">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent-soft">Selected file</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white" title={line.name}>{line.name}</p>
      <p className="font-mono text-[0.7rem] text-ink-400">{line.sizeMm.join(" × ")} mm</p>
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Stat label="Model material" value={g(line.grams)} />
        <Stat label="Total per piece" value={g(line.grams)} />
        {showPrices && (
          <>
            <Stat label="Price per piece" value={inr.format(line.unitPrice)} />
            <Stat label={`× ${line.quantity} pcs${line.discount > 0 ? ` (−${Math.round(line.discount * 100)}%)` : ""}`} value={inr.format(line.subtotal)} strong />
          </>
        )}
      </dl>
    </div>
  );
}

export function EstimatePanel({
  estimate,
  compact = false,
  selectedId,
  onSelect,
}: {
  estimate: Estimate;
  compact?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const instant = estimate.mode === "instant";
  const selected = estimate.lines.find((l) => l.id === selectedId) ?? estimate.lines[0];
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected file visible in the scrollable list (without scrolling the page).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!list || !el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + el.offsetHeight - list.clientHeight;
  }, [selected?.id, estimate.lines.length]);

  return (
    <div className="dark-band relative min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-ink-700" aria-live="polite">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {instant ? <Calculator className="h-4 w-4 text-accent" aria-hidden="true" /> : <ClipboardList className="h-4 w-4 text-accent" aria-hidden="true" />}
          {instant ? "Instant estimate" : "Quotation"}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${instant ? "bg-success/20 text-green-300" : "bg-accent/15 text-accent-soft"}`}>
          {instant ? "Preliminary" : "Manual review"}
        </span>
      </div>

      <div className="relative p-4">
        {instant ? (
          <>
            <p className="text-xs text-ink-300">{estimate.lines.length > 1 ? `Order estimate · ${estimate.lines.length} files` : "Estimated price"}</p>
            <p className="mt-0.5 break-words text-3xl font-extrabold tracking-tight">
              <span className="text-gradient">{inr.format(estimate.low)}</span>
              {estimate.high > estimate.low && (
                <>
                  <span className="text-ink-400"> – </span>
                  <span className="text-gradient">{inr.format(estimate.high)}</span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-ink-300">
              Excl. GST ({Math.round(pricingRules.gstRate * 100)}%) &amp; shipping · {estimate.materialName} · {estimate.technology.toUpperCase()}
            </p>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-bold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" /> We&apos;ll prepare a custom quote
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-200">
              {estimate.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {r}
                </li>
              ))}
            </ul>
          </>
        )}

        {!compact && selected && <SelectedFile line={selected} showPrices={instant} />}

        {!compact && estimate.lines.length > 1 && (
          <div className="mt-4">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ink-400">All files — tap to view</p>
            {/* Scrolls on its own when there are many files, so the panel stays readable. */}
            <ul ref={listRef} className="relative mt-1.5 max-h-36 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
              {estimate.lines.map((l) => (
                <li key={l.id ?? l.name}>
                  <button
                    type="button"
                    onClick={() => l.id && onSelect?.(l.id)}
                    aria-pressed={l.id === selected?.id}
                    className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${l.id === selected?.id ? "bg-accent/15 text-white" : "text-ink-200 hover:bg-ink-800"}`}
                  >
                    <span className="min-w-0 truncate">{l.name}</span>
                    <span className="shrink-0 font-mono text-xs">{instant ? inr.format(l.subtotal) : g(l.grams)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {instant && estimate.lines.length > 0 && (
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-ink-700 pt-3">
            <span className="text-sm text-ink-300">Printing cost (incl. supports)</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-white">{inr.format(estimate.printCost)}</span>
          </div>
        )}

        {estimate.notes.length > 0 && (
          <ul className="mt-3 space-y-1 text-[0.7rem] leading-snug text-ink-300">
            {estimate.notes.map((n) => (
              <li key={n} className="flex gap-1.5"><Info className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden="true" />{n}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[0.7rem] leading-snug text-ink-400">
          Our team reviews every file and confirms the final price before anything is printed.
        </p>
      </div>
    </div>
  );
}
