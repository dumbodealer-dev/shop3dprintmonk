import { getProjects } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";
import { PortfolioEmpty } from "@/components/portfolio/PortfolioEmpty";

export const revalidate = 300;
export const metadata = pageMetadata({
  title: "Our Work — 3D Printing Portfolio",
  description: "Projects printed and finished by 3D PRINTMONK: engineering parts, miniatures, functional prototypes, resin prints, corporate models and bulk orders.",
  path: "/our-work",
});

export default async function OurWorkPage() {
  const projects = await getProjects();
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Printed, finished and delivered"
        lead="A selection of real 3D PRINTMONK projects, with the technology, material and finishing used for each."
        crumbs={[{ href: "/our-work", label: "Our Work" }]}
      />
      <section className="section">
        <div className="container-x">{projects.length ? <PortfolioGallery projects={projects} /> : <PortfolioEmpty />}</div>
      </section>
      <CtaBand location="our_work" />
    </>
  );
}
