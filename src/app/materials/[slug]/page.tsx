import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Info } from "lucide-react";
import { getMaterial, getMaterials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { CtaBand } from "@/components/ui/CtaBand";
import { AvailabilityBadge, materialRows } from "@/components/materials/MaterialBits";
import { MaterialMiniGrid } from "@/components/services/ServiceLayout";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getMaterials()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = await getMaterial((await params).slug);
  if (!m) return {};
  const tech = m.technology === "fdm" ? "FDM" : "SLA resin";
  return pageMetadata({
    title: `${m.name} 3D Printing (${tech}) — Properties & Uses`,
    description: `${m.summary} ${m.name} ${tech} 3D printing service in Delhi with delivery across India.`.slice(0, 160),
    path: `/materials/${m.slug}`,
  });
}

export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = await getMaterial(slug);
  if (!m) notFound();
  const related = (await getMaterials()).filter((x) => x.technology === m.technology && x.slug !== m.slug).slice(0, 3);
  const service = m.technology === "fdm" ? "fdm-3d-printing" : "sla-resin-3d-printing";

  return (
    <>
      <PageHero
        eyebrow={`${m.technology === "fdm" ? "FDM filament" : "SLA resin"} · ${m.family}`}
        title={m.name}
        lead={m.description}
        crumbs={[{ href: "/materials", label: "Materials" }, { href: `/materials/${m.slug}`, label: m.name }]}
      >
        <ButtonLink href={`/get-a-quote?service=${service}`} size="lg" data-track="cta_get_quote" data-track-location="material_page">
          Quote in {m.name} <ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </PageHero>

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold">Best applications</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {m.applications.map((a) => (
                  <li key={a} className="flex gap-3 rounded-xl border border-line bg-white px-4 py-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />{a}
                  </li>
                ))}
              </ul>
            </div>
            {m.limitations.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold">Known limitations</h2>
                <ul className="mt-5 grid gap-3">
                  {m.limitations.map((l) => (
                    <li key={l} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />{l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="dark-band h-fit overflow-hidden rounded-[var(--radius-card)]">
            <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Material profile</span>
              <AvailabilityBadge value={m.availability} />
            </div>
            <dl className="divide-y divide-ink-700">
              {materialRows(m).map((r) => (
                <div key={r.label} className="grid grid-cols-[1fr_1.4fr] gap-4 px-6 py-3.5 text-sm">
                  <dt className="text-ink-300">{r.label}</dt>
                  <dd className="text-white">{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="px-6 py-5 text-xs leading-relaxed text-ink-300">
              General characteristics; exact properties vary by brand, grade and print settings. Availability and colours are confirmed with your quotation.
            </p>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section border-t border-line bg-white">
          <div className="container-x">
            <h2 className="h-section">Compare similar materials</h2>
            <div className="mt-8"><MaterialMiniGrid materials={related} /></div>
          </div>
        </section>
      )}
      <CtaBand whatsapp={m.technology === "fdm" ? "fdm" : "sla"} location="material_detail" />
    </>
  );
}
