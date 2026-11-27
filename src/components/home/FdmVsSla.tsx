import Link from "next/link";
import { Check } from "lucide-react";

const rows: { label: string; fdm: string; sla: string }[] = [
  { label: "Best for", fdm: "Functional parts, prototypes, larger components, economical production", sla: "Fine details, miniatures, display models, smooth surfaces" },
  { label: "Raw material", fdm: "Plastic filament (PLA, PETG, ABS, TPU, nylon…)", sla: "Liquid photopolymer resin (standard, tough, flexible, clear, castable…)" },
  { label: "Surface", fdm: "Visible layer lines; can be sanded and painted", sla: "Very smooth, crisp detail straight from the printer" },
  { label: "Strength", fdm: "Wide range — from rigid to rubber-like and heat tolerant", sla: "Depends on resin; standard resins are more brittle" },
  { label: "Large parts", fdm: "Very economical for big parts", sla: "Possible, but costlier for big solid parts" },
  { label: "Relative cost", fdm: "Generally more economical", sla: "Generally higher per part" },
];

export function FdmVsSla({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      {/* Mobile: two stacked cards */}
      <div className="grid gap-4 md:hidden">
        {(["fdm", "sla"] as const).map((k) => (
          <div key={k} className="card p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-ink">{k === "fdm" ? "FDM · filament" : "SLA · resin"}</p>
            <dl className="mt-3 space-y-3">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{r.label}</dt>
                  <dd className="mt-0.5 text-[0.95rem] text-text">{r[k]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop: comparison table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left">
          <caption className="sr-only">Comparison of FDM and SLA 3D printing</caption>
          <thead>
            <tr className="border-b border-line bg-paper">
              <th scope="col" className="w-44 px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-500">Compare</th>
              <th scope="col" className="px-6 py-4">
                <span className="block text-lg font-bold">FDM</span>
                <span className="text-sm font-medium text-muted">Fused Deposition Modelling · filament</span>
              </th>
              <th scope="col" className="px-6 py-4">
                <span className="block text-lg font-bold">SLA</span>
                <span className="text-sm font-medium text-muted">Stereolithography · resin</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line last:border-0">
                <th scope="row" className="px-6 py-4 align-top text-sm font-semibold text-muted">{r.label}</th>
                <td className="px-6 py-4 align-top text-[0.95rem]">{r.fdm}</td>
                <td className="px-6 py-4 align-top text-[0.95rem]">{r.sla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex gap-3 text-[0.95rem] text-text">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
          <span>
            <strong>The best technology depends on your part</strong> — its intended use, dimensions, material requirements and budget.
            Not sure? Choose “Not sure” in the quote form and we&apos;ll recommend one.
          </span>
        </p>
        {!compact && (
          <Link href="/blog/sla-vs-fdm-which-3d-printing-process" className="shrink-0 text-sm font-semibold text-accent-ink underline underline-offset-4">
            Read the full guide
          </Link>
        )}
      </div>
    </div>
  );
}
