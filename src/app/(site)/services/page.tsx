import { services } from "@/content/services";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { ServiceCard } from "@/components/home/ServiceCard";
import { FdmVsSla } from "@/components/home/FdmVsSla";
import { CtaBand } from "@/components/ui/CtaBand";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = pageMetadata({
  title: "3D Printing Services — FDM, SLA, Bulk Production, Design & Finishing",
  description: "Explore 3D PRINTMONK services: FDM and SLA resin 3D printing, bulk and batch production, custom 3D design and finishing. New Delhi based, delivering across India and worldwide.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="3D printing services from prototype to production"
        lead="Printing, design and finishing under one roof — choose a service or simply describe your project and we'll recommend the right approach."
        crumbs={[{ href: "/services", label: "Services" }]}
      >
        <ButtonLink href="/get-a-quote" size="lg" data-track="cta_get_quote" data-track-location="services_hero">Get a Quote</ButtonLink>
      </PageHero>
      <section className="section">
        <div className="container-x grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>
      <section className="section border-y border-line bg-white">
        <div className="container-x">
          <p className="eyebrow">FDM vs SLA</p>
          <h2 className="h-section mt-3">Which printing technology do I need?</h2>
          <div className="mt-10"><FdmVsSla /></div>
        </div>
      </section>
      <CtaBand location="services_index" />
    </>
  );
}
