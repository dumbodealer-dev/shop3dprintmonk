import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Service } from "@/content/services";
import { iconMap } from "@/components/ui/icons";
import { PhotoPlaceholder } from "@/components/ui/TechIllustration";
import { Tilt } from "@/components/three/Tilt";

const illus = {
  "fdm-3d-printing": "fdm",
  "sla-resin-3d-printing": "sla",
  "bulk-batch-production": "bulk",
  "custom-3d-design": "design",
  "post-processing-finishing": "finishing",
} as const;

export function ServiceCard({ service, featured = false }: { service: Service; featured?: boolean }) {
  const Icon = iconMap[service.icon];
  return (
    <Tilt className={`h-full ${featured ? "lg:col-span-2" : ""}`}>
    <article className={`card group flex h-full flex-col overflow-hidden transition hover:shadow-2xl hover:shadow-accent/10 ${featured ? "lg:flex-row" : ""}`}>
      <div className={`relative aspect-[16/10] shrink-0 ${featured ? "lg:aspect-auto lg:w-1/2" : ""}`}>
        {service.image ? (
          <Image src={service.image} alt={`${service.name} — example project`} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
        ) : (
          <PhotoPlaceholder variant={illus[service.slug]} label={`${service.name} illustration`} className="absolute inset-0" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-accent">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="text-xl font-bold">
            <Link href={`/services/${service.slug}`} className="hover:text-accent-ink">
              {service.name}
            </Link>
          </h3>
        </div>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">{service.summary}</p>
        <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-500">Best for</p>
        <ul className="mt-2 grid gap-1.5 text-sm">
          {service.bestFor.map((b) => (
            <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />{b}</li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-sm font-semibold">
          <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-1.5 text-text hover:text-accent-ink" data-track="service_engagement" data-track-service={service.slug}>
            Explore {service.shortName} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link href={`/get-a-quote?service=${service.slug}`} className="text-accent-ink hover:text-text" data-track="cta_get_quote" data-track-location="service_card" data-track-service={service.slug}>
            Get a quote<span className="sr-only"> for {service.shortName}</span>
          </Link>
        </div>
      </div>
    </article>
    </Tilt>
  );
}
