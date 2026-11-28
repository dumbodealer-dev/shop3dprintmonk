import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { getMaterials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import type { Material } from "@/content/types";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { AvailabilityBadge, CostMeter } from "@/components/materials/MaterialBits";

export const revalidate = 300;
export const metadata = pageMetadata({
  title: "3D Printing Materials — PLA, PETG, ABS, TPU, Nylon & Resins",
  description:
    "Compare FDM filaments (PLA, PETG, ABS, ASA, TPU, nylon, carbon-fibre) and SLA resins (standard, tough, flexible, clear, castable): strength, heat resistance, finish and uses.",
  path: "/materials",
});

export default async function MaterialsPage() {
  const materials = await getMaterials();
  const fdm = materials.filter((m) => m.technology === "fdm");
  const sla = materials.filter((m) => m.technology === "sla");

  return (
    <>
      <PageHero
        eyebrow="Materials library"
        title="Choose the right material for your part"
        lead="A plain-language guide to the filaments and resins we print with — what each is good at, its limitations and where it's typically used."
        crumbs={[{ href: "/materials", label: "Materials" }]}
      >
        <a href="#fdm" className="rounded-full border border-ink-600 px-4 py-2 text-sm font-semibold text-white hover:border-accent">FDM filaments ({fdm.length})</a>
        <a href="#sla" className="rounded-full border border-ink-600 px-4 py-2 text-sm font-semibold text-white hover:border-accent">SLA resins ({sla.length})</a>
      </PageHero>

      <div className="container-x pt-10">
        <p className="flex gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
          Properties are general characteristics of each material family and vary by brand and grade. Availability, colours and pricing change —
          we confirm the exact material with every quotation. Cost symbols are relative, not prices.
        </p>
      </div>

      <MaterialGroup id="fdm" title="FDM filaments" lead="Melted plastic filament, printed layer by layer — strong, versatile and economical." items={fdm} />
      <MaterialGroup id="sla" title="SLA resins" lead="Liquid resin cured by light — fine detail and smooth surfaces." items={sla} />
      <CtaBand title="Not sure which material?" text="Tell us what the part needs to withstand — heat, load, flexing, outdoor use — and we'll recommend a material." location="materials" />
    </>
  );
}

function MaterialGroup({ id, title, lead, items }: { id: string; title: string; lead: string; items: Material[] }) {
  if (!items.length) return null;
  return (
    <section id={id} className="section scroll-mt-20" aria-labelledby={`${id}-h`}>
      <div className="container-x">
        <h2 id={`${id}-h`} className="h-section">{title}</h2>
        <p className="lead mt-3">{lead}</p>
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <li key={m.slug}>
              <Link href={`/materials/${m.slug}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lg hover:shadow-ink-900/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-ink-500">{m.family}</p>
                    <h3 className="mt-1 text-xl font-bold">{m.name}</h3>
                  </div>
                  <CostMeter level={m.costLevel} />
                </div>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{m.summary}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                  <div><dt className="text-xs text-ink-500">Strength</dt><dd className="font-medium">{m.strength ?? "—"}</dd></div>
                  <div><dt className="text-xs text-ink-500">Heat</dt><dd className="font-medium">{m.heatResistance ?? "—"}</dd></div>
                </dl>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <AvailabilityBadge value={m.availability} />
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-ink">Details <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
