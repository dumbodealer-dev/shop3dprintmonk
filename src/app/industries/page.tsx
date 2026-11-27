import { ArrowRight, Check } from "lucide-react";
import { industries } from "@/content/industries";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { ButtonLink } from "@/components/ui/Button";
import { iconMap } from "@/components/ui/icons";

export const metadata = pageMetadata({
  title: "Industries We Serve — 3D Printing for Engineering, Startups & More",
  description: "3D printing for engineering, startups, automotive, architecture, education, artists, miniatures and corporate projects in Delhi NCR and across India.",
  path: "/industries",
});

export default function IndustriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Industries"
        title="3D printing for every kind of project"
        lead="From engineering teams and startups to artists, students and corporate clients — here's how customers typically use 3D printing."
        crumbs={[{ href: "/industries", label: "Industries" }]}
      />
      <section className="section">
        <div className="container-x grid gap-6 lg:grid-cols-2">
          {industries.map((ind) => {
            const Icon = iconMap[ind.icon];
            return (
              <article key={ind.slug} id={ind.slug} className="card scroll-mt-24 p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 text-accent"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <h2 className="text-xl font-bold sm:text-2xl">{ind.name}</h2>
                </div>
                <p className="mt-4 text-muted">{ind.summary}</p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {ind.examples.map((e) => (
                    <li key={e} className="flex gap-2 text-[0.95rem]"><Check className="mt-1 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />{e}</li>
                  ))}
                </ul>
                <p className="mt-5 rounded-xl bg-paper px-4 py-3 text-sm"><span className="font-semibold">Typical approach: </span><span className="text-muted">{ind.recommended}</span></p>
                <ButtonLink href="/get-a-quote" variant="ghost" className="mt-4 !px-0" data-track="cta_get_quote" data-track-location={`industry_${ind.slug}`}>
                  Discuss your project <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </article>
            );
          })}
        </div>
      </section>
      <CtaBand location="industries" />
    </>
  );
}
