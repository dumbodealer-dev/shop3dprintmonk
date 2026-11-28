import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Box, Calculator, Check, Clock, FileUp, Globe2, Layers, MessagesSquare, PackageCheck, ThumbsUp } from "lucide-react";
import { business } from "@/config/business";
import { media } from "@/config/media";
import { services } from "@/content/services";
import { industries } from "@/content/industries";
import { getFeaturedProjects } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TechIllustration } from "@/components/ui/TechIllustration";
import { CtaBand } from "@/components/ui/CtaBand";
import { iconMap } from "@/components/ui/icons";
import { ServiceCard } from "@/components/home/ServiceCard";
import { FdmVsSla } from "@/components/home/FdmVsSla";
import { PortfolioGallery } from "@/components/portfolio/PortfolioGallery";
import { PortfolioEmpty } from "@/components/portfolio/PortfolioEmpty";
import { latestPosts } from "@/content/blog";
import { HeroVisual } from "@/components/three/HeroVisual";
import { Floating3D } from "@/components/three/Floating3D";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "3D Printing Services in Delhi NCR & India | FDM & SLA — 3D PRINTMONK",
  description:
    "From one prototype to bulk production: custom FDM and SLA resin 3D printing, 3D design and finishing in Delhi. Send your STL, CAD file, image or idea for a quote.",
  path: "/",
});

const steps = [
  { icon: FileUp, title: "Share your design or idea", text: "Upload an STL, OBJ, 3MF or STEP file — or send a sketch, photo or description." },
  { icon: MessagesSquare, title: "Get your price", text: "See an instant estimate for simple parts, or receive a detailed quotation for complex and bulk orders." },
  { icon: ThumbsUp, title: "Approve design, material & price", text: "Confirm the details. Nothing is printed until you approve." },
  { icon: PackageCheck, title: "We print, finish, inspect & deliver", text: "Your parts are printed, post-processed, checked and shipped to you." },
];

const finishing = [
  "Support removal",
  "Sanding",
  "Priming",
  "Painting",
  "Coating",
  "Assembly, where applicable",
  "Custom design & model preparation",
];

export default async function HomePage() {
  const projects = await getFeaturedProjects(6);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="dark-band relative overflow-hidden">
        <div className="tech-grid absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="container-x relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:py-20">
          <div>
            <p className="eyebrow">3D printing studio · New Delhi · Open 24×7</p>
            <h1 className="h-display mt-5">
              From One Prototype to <span className="text-gradient">Bulk Production.</span>
            </h1>
            <p className="lead mt-6 max-w-xl">
              Custom FDM and SLA 3D printing, precision finishing, and manufacturing support—all under one roof.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/get-a-quote" size="lg" data-track="cta_get_quote" data-track-location="hero">
                Get an Instant Estimate <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/our-work" size="lg" variant="outline-dark">Explore Our Work</ButtonLink>
            </div>
            <p className="mt-8 max-w-xl border-l-2 border-accent/60 pl-4 text-sm leading-relaxed text-ink-300">
              Send us an <strong className="text-white">STL file, CAD model, reference image or just your project idea</strong> — we&apos;ll help
              you choose the right process and material. Based in New Delhi — delivering across India and worldwide.
            </p>
          </div>

          <div className="relative">
            {media.hero ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-ink-700">
                <Image src={media.hero.src} alt={media.hero.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              </div>
            ) : (
              <div className="glow-ring relative overflow-hidden rounded-[1.75rem] border border-ink-700 bg-gradient-to-b from-ink-850/80 to-ink-950/80">
                <HeroVisual
                  fallback={<TechIllustration variant="hero" className="h-full w-full p-2" title="Illustration of FDM and SLA printed parts on a build plate" />}
                />
              </div>
            )}
          </div>
        </div>

        {/* Fact strip */}
        <div className="relative border-t border-ink-700/70 bg-ink-950/60 backdrop-blur">
          <ul className="container-x grid grid-cols-2 gap-x-6 gap-y-3 py-5 text-sm text-ink-200 md:grid-cols-4">
            {[
              [Clock, "Open 24×7"],
              [Calculator, "Instant online estimates"],
              [Layers, "FDM + SLA under one roof"],
              [Globe2, "India & worldwide delivery"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Clock;
              return (
                <li key={label as string} className="flex items-center gap-2.5">
                  <I className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {label as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Verified stats (rendered only when provided) ─────────────────── */}
      {business.stats.length > 0 && (
        <section aria-label="3D PRINTMONK in numbers" className="border-b border-line bg-white">
          <dl className="container-x grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
            {business.stats.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="mt-1 text-3xl font-extrabold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <section className="section" aria-labelledby="services-heading">
        <div className="container-x">
          <SectionHeading
            id="services-heading"
            eyebrow="Services"
            title="Everything from a single part to a production run"
            lead="Pick a service to learn more, or just send us your project and we'll recommend the right approach."
            action={<ButtonLink href="/services" variant="secondary">All services</ButtonLink>}
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
            <div className="dark-band tech-grid flex flex-col justify-between rounded-[var(--radius-card)] p-6">
              <div>
                <p className="eyebrow">Not sure where to start?</p>
                <p className="mt-4 text-2xl font-bold leading-snug">Tell us what the part needs to do — we&apos;ll handle the technical choices.</p>
              </div>
              <ButtonLink href="/get-a-quote" className="mt-8 self-start" data-track="cta_get_quote" data-track-location="services_grid">
                Start a quote <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Instant estimate promo ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-ink-950 py-16 text-white sm:py-20" aria-labelledby="instant-heading">
        <div className="tech-grid absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-accent/15 to-transparent" aria-hidden="true" />
        <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">Instant estimate</p>
            <h2 id="instant-heading" className="h-section mt-3">
              Drop your file. <span className="text-gradient">See it in 3D.</span> Get a price.
            </h2>
            <p className="lead mt-4 max-w-xl">
              Upload an STL, OBJ or 3MF file and our quote tool shows your model in 3D, measures it and gives a preliminary price in rupees — in
              seconds. Complex, painted or bulk orders get a detailed manual quote from our team.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-ink-200 sm:grid-cols-2">
              {["Interactive 3D preview of your part", "Automatic size & volume measurement", "Live price as you change material & quantity", "Final price confirmed before printing"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <ButtonLink href="/get-a-quote" size="lg" className="mt-8" data-track="cta_get_quote" data-track-location="instant_promo">
              Try the instant estimate <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="relative mx-auto flex h-72 w-full max-w-md items-center justify-center sm:h-80" aria-hidden="true">
            <div className="absolute inset-8 rounded-full bg-accent/20 blur-3xl" />
            <Floating3D shape="layers" size={190} speed={22} />
            <Floating3D shape="cube" size={64} className="absolute left-2 top-4" delay={-3} />
            <Floating3D shape="gem" size={70} className="absolute bottom-6 right-4" delay={-6} speed={14} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-2xl border border-ink-700 bg-ink-900/90 px-5 py-3 text-center shadow-2xl backdrop-blur">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-300">Estimated price</p>
              <p className="text-gradient text-2xl font-extrabold">₹ in seconds</p>
            </div>
            <Box className="absolute right-10 top-8 h-6 w-6 text-accent/70" />
          </div>
        </div>
      </section>

      {/* ── FDM vs SLA ───────────────────────────────────────────────────── */}
      <section className="section border-y border-line bg-white" aria-labelledby="compare-heading">
        <div className="container-x">
          <SectionHeading
            id="compare-heading"
            eyebrow="FDM vs SLA"
            title="Two technologies, chosen for your part"
            lead="FDM builds parts from plastic filament; SLA cures liquid resin with light. Here's how they differ in plain terms."
          />
          <div className="mt-10">
            <FdmVsSla />
          </div>
        </div>
      </section>

      {/* ── Featured portfolio ───────────────────────────────────────────── */}
      <section className="section" aria-labelledby="work-heading">
        <div className="container-x">
          <SectionHeading
            id="work-heading"
            eyebrow="Our work"
            title="Recent projects"
            lead="Real parts printed and finished by 3D PRINTMONK — technology, material and finish listed for each."
            action={projects.length > 0 ? <ButtonLink href="/our-work" variant="secondary">View all work</ButtonLink> : undefined}
          />
          <div className="mt-10">{projects.length > 0 ? <PortfolioGallery projects={projects} /> : <PortfolioEmpty />}</div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="dark-band section" aria-labelledby="process-heading">
        <div className="container-x">
          <SectionHeading id="process-heading" eyebrow="How it works" title="Four simple steps" lead="No technical knowledge needed — we guide you from idea to delivered part." />
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="card-dark relative p-6">
                <span className="font-mono text-xs tracking-[0.2em] text-accent">STEP {String(i + 1).padStart(2, "0")}</span>
                <s.icon className="mt-5 h-7 w-7 text-white" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <ButtonLink href="/get-a-quote" size="lg" data-track="cta_get_quote" data-track-location="how_it_works">
              Get a Quote <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ── Industries ───────────────────────────────────────────────────── */}
      <section className="section" aria-labelledby="industries-heading">
        <div className="container-x">
          <SectionHeading
            id="industries-heading"
            eyebrow="Industries we serve"
            title="Built for engineers, creators and businesses"
            action={<ButtonLink href="/industries" variant="secondary">Explore industries</ButtonLink>}
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((ind) => {
              const Icon = iconMap[ind.icon];
              return (
                <li key={ind.slug}>
                  <Link href={`/industries#${ind.slug}`} className="card group flex h-full flex-col p-5 transition hover:border-ink-300">
                    <Icon className="h-6 w-6 text-accent-ink" aria-hidden="true" />
                    <h3 className="mt-4 font-bold">{ind.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{ind.summary}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Finishing ────────────────────────────────────────────────────── */}
      <section className="section border-y border-line bg-white" aria-labelledby="finishing-heading">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              id="finishing-heading"
              eyebrow="Finishing & extras"
              title="More than just printing"
              lead="Take parts from raw print to presentation-ready, or let us prepare the model for you."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {finishing.map((f) => (
                <li key={f} className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-[0.95rem] font-medium">
                  <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">Availability and pricing of finishing services depend on the project — we confirm them with your quotation.</p>
            <ButtonLink href="/services/post-processing-finishing" variant="dark" className="mt-6">
              Finishing services <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="dark-band tech-grid overflow-hidden rounded-[1.75rem] p-4">
            <TechIllustration variant="finishing" className="h-auto w-full" title="Illustration of a part before and after finishing" />
          </div>
        </div>
      </section>

      {/* ── Latest guides ────────────────────────────────────────────────── */}
      <section className="section" aria-labelledby="guides-heading">
        <div className="container-x">
          <SectionHeading
            id="guides-heading"
            eyebrow="Blog"
            title="3D printing guides"
            lead="Clear answers on pricing, materials and design — before you order."
            action={<ButtonLink href="/blog" variant="secondary">All articles</ButtonLink>}
          />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {latestPosts(3).map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/5">
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-accent-ink">{p.category} · {p.readingMinutes} min read</span>
                  <span className="mt-3 text-lg font-bold leading-snug group-hover:text-accent-ink">{p.title}</span>
                  <span className="mt-3 line-clamp-3 text-sm text-muted">{p.quickAnswer}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-accent-ink">Read guide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand location="home_final" />
    </>
  );
}
