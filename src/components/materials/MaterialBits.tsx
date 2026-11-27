import type { Availability, Material } from "@/content/types";

export const COST_LABEL = { 1: "Economical", 2: "Moderate", 3: "Premium" } as const;

export function CostMeter({ level }: { level?: 1 | 2 | 3 | null }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center gap-1.5" title={`Relative cost: ${COST_LABEL[level]}`}>
      <span className="sr-only">Relative cost: {COST_LABEL[level]}</span>
      <span aria-hidden="true" className="font-mono text-sm">
        <span className="text-text">{"₹".repeat(level)}</span>
        <span className="text-line">{"₹".repeat(3 - level)}</span>
      </span>
    </span>
  );
}

const AVAIL: Record<Availability, { label: string; cls: string }> = {
  in_stock: { label: "Available", cls: "bg-green-50 text-green-800 border-green-200" },
  on_request: { label: "Confirm with quote", cls: "bg-paper text-muted border-line" },
  unavailable: { label: "Currently unavailable", cls: "bg-red-50 text-red-800 border-red-200" },
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  const a = AVAIL[value];
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${a.cls}`}>{a.label}</span>;
}

export function materialRows(m: Material) {
  return [
    { label: "Technology", value: m.technology === "fdm" ? "FDM (filament)" : "SLA (resin)" },
    { label: "Strength", value: m.strength },
    { label: "Flexibility", value: m.flexibility },
    { label: "Heat resistance", value: m.heatResistance },
    { label: "Surface finish", value: m.surfaceFinish },
    { label: "Colours", value: m.colors },
    { label: "Relative cost", value: m.costLevel ? COST_LABEL[m.costLevel] : null },
    { label: "Pricing", value: m.priceNote },
  ].filter((r) => r.value) as { label: string; value: string }[];
}
