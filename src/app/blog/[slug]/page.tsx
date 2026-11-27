import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronDown, Lightbulb, Zap } from "lucide-react";
import { business } from "@/config/business";
import { postBySlug, posts, relatedPosts, type Block } from "@/content/blog";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBand } from "@/components/ui/CtaBand";
import { JsonLd } from "@/components/ui/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  const meta = pageMetadata({ title: p.title, description: p.description, path: `/blog/${p.slug}`, type: "article" });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: p.publishedAt, modifiedTime: p.updatedAt ?? p.publishedAt, tags: p.tags },
  };
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function renderBlock(b: Block, i: number) {
  switch (b.type) {
    case "h2":
      return <h2 key={i} id={slugify(b.text)} className="scroll-mt-24">{b.text}</h2>;
    case "h3":
      return <h3 key={i}>{b.text}</h3>;
    case "ul":
      return <ul key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
    case "ol":
      return <ol key={i} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-accent-ink">{b.items.map((t) => <li key={t}>{t}</li>)}</ol>;
    case "table":
      return (
        <div key={i} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[32rem] border-collapse overflow-hidden rounded-xl text-left text-[0.92rem]">
            <thead>
              <tr className="bg-ink-900 text-white">
                {b.head.map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-semibold first:rounded-tl-xl last:rounded-tr-xl">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.join("|")} className="border-b border-line bg-white even:bg-paper">
                  {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-2.5 font-semibold text-text">{c}</th> : <td key={j} className="px-3 py-2.5">{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <p key={i} className="flex gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5 text-text">
          <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
          <span>{b.text}</span>
        </p>
      );
    default:
      return <p key={i}>{b.text}</p>;
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const url = new URL(`/blog/${post.slug}`, business.siteUrl).toString();
  const toc = post.body.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");
  const more = relatedPosts(post);

  return (
    <>
      <PageHero
        eyebrow={`${post.category} · ${post.readingMinutes} min read`}
        title={post.title}
        lead={post.description}
        crumbs={[{ href: "/blog", label: "Blog" }, { href: `/blog/${post.slug}`, label: post.title }]}
      />
      <article className="section">
        <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 max-w-3xl">
            <p className="text-sm text-muted">
              By <strong className="text-text">{business.name}</strong>, {business.address.city} · Published{" "}
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <> · Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></>
              )}
            </p>

            {/* Direct answer first — what search engines and AI assistants quote */}
            <section aria-labelledby="quick-answer" className="mt-6 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent p-6">
              <h2 id="quick-answer" className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-accent-ink">
                <Zap className="h-4 w-4" aria-hidden="true" /> Quick answer
              </h2>
              <p className="mt-3 text-[1.08rem] leading-relaxed text-text">{post.quickAnswer}</p>
            </section>

            <section aria-labelledby="takeaways" className="mt-6 rounded-2xl border border-line bg-white p-6">
              <h2 id="takeaways" className="text-lg font-bold">Key takeaways</h2>
              <ul className="mt-3 space-y-2">
                {post.takeaways.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[0.98rem] text-muted">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-ink" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>

            <div className="prose-body mt-10">{post.body.map(renderBlock)}</div>

            {post.faqs.length > 0 && (
              <section aria-labelledby="faq" className="mt-12">
                <h2 id="faq" className="text-2xl font-bold">Frequently asked questions</h2>
                <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                  {post.faqs.map((f) => (
                    <details key={f.q} className="group" open>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-paper [&::-webkit-details-marker]:hidden">
                        <h3 className="text-base">{f.q}</h3>
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <p className="px-5 pb-5 leading-relaxed text-muted">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {post.related && post.related.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.related.map((r) => (
                  <Link key={r.href} href={r.href} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-text hover:border-accent hover:text-accent-ink">
                    {r.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="hidden lg:block" aria-label="On this page">
            <div className="sticky top-24 space-y-6">
              {toc.length > 0 && (
                <nav className="card p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-500">On this page</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {toc.map((h) => (
                      <li key={h.text}><a href={`#${slugify(h.text)}`} className="text-muted hover:text-accent-ink">{h.text}</a></li>
                    ))}
                    {post.faqs.length > 0 && <li><a href="#faq" className="text-muted hover:text-accent-ink">FAQs</a></li>}
                  </ul>
                </nav>
              )}
              <div className="dark-band rounded-[var(--radius-card)] p-5">
                <p className="font-bold">Have a file ready?</p>
                <p className="mt-1 text-sm text-ink-300">See it in 3D with an instant estimate.</p>
                <Link href="/get-a-quote" className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-ink-950 hover:bg-accent-soft">
                  Get a quote <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </article>

      {more.length > 0 && (
        <section className="border-t border-line bg-white py-14" aria-labelledby="more-guides">
          <div className="container-x">
            <h2 id="more-guides" className="text-2xl font-bold">More guides</h2>
            <ul className="mt-6 grid gap-5 md:grid-cols-3">
              {more.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="card group flex h-full flex-col p-5 transition hover:border-accent/50">
                    <span className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-accent-ink">{p.category}</span>
                    <span className="mt-2 font-bold leading-snug group-hover:text-accent-ink">{p.title}</span>
                    <span className="mt-2 line-clamp-2 text-sm text-muted">{p.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            abstract: post.quickAnswer,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
            keywords: post.tags.join(", "),
            articleSection: post.category,
            inLanguage: "en-IN",
            image: new URL("/opengraph-image", business.siteUrl).toString(),
            author: { "@type": "Organization", name: business.name, url: business.siteUrl },
            publisher: { "@id": `${business.siteUrl}/#organization`, name: business.name, logo: { "@type": "ImageObject", url: new URL(business.logoFull, business.siteUrl).toString() } },
            mainEntityOfPage: url,
          },
          ...(post.faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: post.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
                },
              ]
            : []),
        ]}
      />
      <CtaBand location={`blog_${post.slug}`} />
    </>
  );
}
