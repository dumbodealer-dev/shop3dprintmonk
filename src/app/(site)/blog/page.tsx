import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { business } from "@/config/business";
import { latestPosts } from "@/content/blog";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";

export const metadata = pageMetadata({
  title: "3D Printing Blog — Prices, Materials, Design Guides",
  description:
    "Practical 3D printing guides from 3D PRINTMONK, New Delhi: 3D printing cost in India, choosing filament and resin, design guidelines, file formats and bulk printing.",
  path: "/blog",
});

export default function BlogIndex() {
  const all = latestPosts(100);
  const [featured, ...rest] = all;
  return (
    <>
      <PageHero
        eyebrow="Blog · Knowledge hub"
        title="3D printing guides & insights"
        lead="Straight answers on pricing, materials, design and ordering — written by the 3D PRINTMONK team in New Delhi."
        crumbs={[{ href: "/blog", label: "Blog" }]}
      />
      <section className="section">
        <div className="container-x">
          {featured && (
            <Link href={`/blog/${featured.slug}`} className="group relative block overflow-hidden rounded-[1.5rem] bg-ink-950 p-7 text-white sm:p-10">
              <div className="tech-grid absolute inset-0 opacity-70" aria-hidden="true" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />
              <div className="relative max-w-3xl">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Featured · {featured.category}</p>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{featured.title}</h2>
                <p className="mt-4 text-ink-300">{featured.quickAnswer}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-accent">
                  Read the guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          )}
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="card group flex h-full flex-col p-6 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/5">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-accent-ink">{p.category} · {p.readingMinutes} min</p>
                  <h2 className="mt-3 text-xl font-bold leading-snug group-hover:text-accent-ink">{p.title}</h2>
                  <p className="mt-3 line-clamp-3 flex-1 text-[0.95rem] text-muted">{p.description}</p>
                  <time dateTime={p.updatedAt ?? p.publishedAt} className="mt-5 text-xs text-ink-500">{formatDate(p.updatedAt ?? p.publishedAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: `${business.name} Blog`,
          url: new URL("/blog", business.siteUrl).toString(),
          publisher: { "@id": `${business.siteUrl}/#organization` },
          blogPost: all.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: new URL(`/blog/${p.slug}`, business.siteUrl).toString(), datePublished: p.publishedAt })),
        }}
      />
      <CtaBand location="blog_index" />
    </>
  );
}
