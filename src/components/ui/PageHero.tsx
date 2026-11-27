import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Floating3D } from "@/components/three/Floating3D";

export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs: Crumb[];
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="dark-band tech-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-900" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
      {!aside && (
        <>
          <Floating3D shape="cube" size={120} className="absolute right-[12%] top-16 hidden lg:block" />
          <Floating3D shape="layers" size={100} className="absolute bottom-10 right-[26%] hidden xl:block" delay={-4} />
        </>
      )}
      <div className={`container-x relative grid gap-10 py-12 sm:py-16 ${aside ? "lg:grid-cols-[1.15fr_1fr] lg:items-center" : ""}`}>
        <div>
          <Breadcrumbs items={crumbs} />
          {eyebrow && <p className="eyebrow mt-8">{eyebrow}</p>}
          <h1 className="h-display mt-4 max-w-3xl">{title}</h1>
          {lead && <p className="lead mt-5 max-w-2xl">{lead}</p>}
          {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
        </div>
        {aside && <div className="hidden lg:block">{aside}</div>}
      </div>
    </section>
  );
}
