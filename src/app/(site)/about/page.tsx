import Image from "next/image";
import { Clock, Globe2, Layers3, MapPin } from "lucide-react";
import { business } from "@/config/business";
import { media } from "@/config/media";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { LogoFull } from "@/components/ui/Logo";
import { InfoGrid } from "@/components/services/ServiceLayout";
import { Floating3D } from "@/components/three/Floating3D";

export const metadata = pageMetadata({
  title: "About 3D PRINTMONK — 24×7 3D Printing Studio in New Delhi",
  description:
    "3D PRINTMONK is a New Delhi 3D printing studio, open 24×7, offering FDM and SLA printing, 3D design, finishing and batch production — delivering across India and worldwide.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={`${business.name}: a 3D printing studio in ${business.address.city}`}
        lead="We help individuals, engineers, creators and businesses turn designs and ideas into real parts — from a single prototype to production batches."
        crumbs={[{ href: "/about", label: "About Us" }]}
      />

      {/* ── Motto ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950 py-20 text-white sm:py-28" aria-labelledby="motto-heading">
        <div className="tech-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
        <Floating3D className="absolute left-10 top-14 hidden md:block" shape="cube" size={90} />
        <Floating3D className="absolute bottom-10 right-8 hidden md:block" shape="pyramid" size={110} delay={-4} />
        <div className="container-x relative text-center">
          <p id="motto-heading" className="eyebrow justify-center">Our motto</p>
          <blockquote className="mx-auto mt-8 max-w-4xl">
            <p className="text-balance text-3xl font-extrabold leading-tight sm:text-5xl">
              &ldquo;We wish to open a <span className="text-gradient">very big 3D print farm</span> where you can get{" "}
              <span className="text-gradient">24×7 printing service</span> in India.&rdquo;
            </p>
          </blockquote>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: Clock, t: "Open 24×7", d: "Enquiries and printing around the clock" },
              { icon: Layers3, t: "Growing print farm", d: "Scaling capacity for bigger runs" },
              { icon: Globe2, t: "India & worldwide", d: "Based in New Delhi, shipping everywhere" },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-ink-700 bg-ink-900/70 p-5 backdrop-blur">
                <x.icon className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
                <p className="mt-3 font-bold">{x.t}</p>
                <p className="mt-1 text-sm text-ink-300">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="prose-body">
            <h2 className="!pt-0 text-3xl font-extrabold">What we do</h2>
            <p>
              {business.name} provides custom FDM and SLA 3D printing, 3D design and model preparation, sanding, painting and finishing, and
              small-batch production{business.foundedYear ? ` — since ${business.foundedYear}` : ""}. We&apos;re based in {business.address.city} and
              deliver to customers across India and outside India too.
            </p>
            <p>
              Many of our customers don&apos;t start with a perfect CAD file. Some have a sketch, a broken part or simply an idea. Our job is to
              understand what the part needs to do, then recommend the process, material and finish that suit its purpose and budget.
            </p>
            <p className="flex items-start gap-2 text-text">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
              <span>
                {business.address.street}, {business.address.locality}, {business.address.city} {business.address.postalCode}
              </span>
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-6 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
            <div className="card relative p-8">
              <LogoFull className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="section border-y border-line bg-white">
        <div className="container-x">
          <p className="eyebrow">Our approach</p>
          <h2 className="h-section mt-3">How we approach quality</h2>
          <div className="mt-10">
            <InfoGrid
              items={[
                { title: "Understand the purpose first", text: "We ask how the part will be used — load, heat, fit, appearance — before choosing a process or material." },
                { title: "Clear, honest quotations", text: "Instant estimates for simple parts, detailed manual quotes for complex work — all in Indian rupees. Nothing is printed until you approve." },
                { title: "Right process for the job", text: "FDM where strength and economy matter, SLA where detail and surface matter — and we'll tell you which is which." },
                { title: "Checked before dispatch", text: "Parts are cleaned, finished as agreed and checked before they're packed and shipped." },
                { title: "Your designs stay yours", text: "Uploaded files are stored privately and used only for your project." },
                { title: "From one to many", text: "The same care for a single prototype as for a production batch, with repeat orders matched to what you approved." },
              ]}
            />
          </div>
        </div>
      </section>

      {media.about.length > 0 && (
        <section className="section">
          <div className="container-x">
            <h2 className="h-section">Inside the studio</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.about.map((p) => (
                <li key={p.src} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image src={p.src} alt={p.alt} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <CtaBand location="about" />
    </>
  );
}
