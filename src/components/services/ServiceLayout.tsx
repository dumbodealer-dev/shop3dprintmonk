import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import type { Service } from "@/content/services";
import type { Material } from "@/content/types";
import { PageHero } from "@/components/ui/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";
import { TechIllustration } from "@/components/ui/TechIllustration";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";
import { serviceJsonLd } from "@/lib/seo";

const illus = {
  "fdm-3d-printing": "fdm",
  "sla-resin-3d-printing": "sla",
  "bulk-batch-production": "bulk",
  "custom-3d-design": "design",
  "post-processing-finishing": "finishing",
} as const;

export function ServiceLayout({
  service,
  title,
  lead,
  quoteHref,
  children,
}: {
  service: Service;
  title: string;
  lead: string;
  quoteHref?: string;
  children: ReactNode;
}) {
  const href = quoteHref ?? `/get-a-quote?service=${service.slug}`;
  return (
    <>
      <JsonLd data={serviceJsonLd(service.name, service.seoDescription, `/services/${service.slug}`)} />
      <PageHero
        eyebrow={service.name}
        title={title}
        lead={lead}
        crumbs={[{ href: "/services", label: "Services" }, { href: `/services/${service.slug}`, label: service.name }]}
        aside={
          <div className="rounded-[1.75rem] border border-ink-700 bg-ink-850/60 p-2">
            <TechIllustration variant={illus[service.slug]} className="h-auto w-full" title={`${service.name} illustration`} />
          </div>
        }
      >
        <ButtonLink href={href} size="lg" data-track="cta_get_quote" data-track-location="service_hero" data-track-service={service.slug}>
          Get a Quote <ArrowRight className="h-4 w-4" />
        </ButtonLink>
        <WhatsAppLink context={service.whatsapp} variant="outline-dark" size="lg" />
      </PageHero>
      {children}
      <CtaBand whatsapp={service.whatsapp} quoteHref={href} location={`service_${service.slug}`} />
    </>
  );
}

export function Section({ eyebrow, title, lead, children, tone = "paper", id }: { eyebrow?: string; title: string; lead?: string; children: ReactNode; tone?: "paper" | "white"; id?: string }) {
  return (
    <section id={id} className={`section ${tone === "white" ? "border-y border-line bg-white" : ""}`}>
      <div className="container-x">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="h-section mt-3">{title}</h2>
          {lead && <p className="lead mt-4">{lead}</p>}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function InfoGrid({ items, cols = 3 }: { items: { title: string; text: string }[]; cols?: 2 | 3 | 4 }) {
  const c = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <ul className={`grid gap-4 ${c}`}>
      {items.map((i, n) => (
        <li key={i.title} className="card p-6">
          <span className="font-mono text-xs text-accent-ink">{String(n + 1).padStart(2, "0")}</span>
          <h3 className="mt-3 text-lg font-bold">{i.title}</h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{i.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function CheckList({ items, cols = 2 }: { items: string[]; cols?: 1 | 2 | 3 }) {
  const c = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" }[cols];
  return (
    <ul className={`grid gap-3 ${c}`}>
      {items.map((i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[0.95rem]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

/** Spec panel fed from verified config; missing values are explained instead of invented. */
export function SpecPanel({ rows, note }: { rows: { label: string; value: string | null }[]; note?: string }) {
  const known = rows.filter((r) => r.value);
  return (
    <div className="dark-band overflow-hidden rounded-[var(--radius-card)]">
      <div className="border-b border-ink-700 px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-accent">Technical specifications</div>
      {known.length > 0 && (
        <dl className="divide-y divide-ink-700">
          {known.map((r) => (
            <div key={r.label} className="grid grid-cols-[1fr_1.3fr] gap-4 px-6 py-3.5 text-sm">
              <dt className="text-ink-300">{r.label}</dt>
              <dd className="font-mono text-white">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="flex gap-3 px-6 py-5 text-sm leading-relaxed text-ink-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        {note ??
          "Layer height and achievable tolerances depend on the material and part geometry — we confirm them for your part with the quotation. Parts of any size are welcome."}
      </p>
    </div>
  );
}

const COST = ["", "₹ Economical", "₹₹ Moderate", "₹₹₹ Premium"];

export function MaterialMiniGrid({ materials }: { materials: Material[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {materials.map((m) => (
        <li key={m.slug}>
          <Link href={`/materials/${m.slug}`} className="card group flex h-full flex-col p-5 transition hover:border-ink-300">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">{m.name}</h3>
              {m.costLevel && <span className="shrink-0 font-mono text-xs text-muted" title="Relative cost">{COST[m.costLevel]}</span>}
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{m.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink">
              Properties <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Limitations({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.95rem] text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          {i}
        </li>
      ))}
    </ul>
  );
}
