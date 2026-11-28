import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Ruler } from "lucide-react";
import { JsonLd } from "@/components/ui/JsonLd";
import { shopHref } from "@/shop/config";
import { ProductGallery } from "@/shop/components/ProductGallery";
import { ProductGrid } from "@/shop/components/ProductCard";
import { ProductPurchase } from "@/shop/components/ProductPurchase";
import { ReviewForm } from "@/shop/components/ReviewForm";
import { Badge, Stars } from "@/shop/components/ui";
import { breadcrumbJsonLd, productJsonLd, shopMetadata } from "@/shop/seo";
import { getProduct, getRelatedProducts, getReviews } from "@/shop/server/catalog";
import { getSettings } from "@/shop/server/settings";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) notFound(); // thrown here so the response is a real 404
  return shopMetadata({
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.shortDescription ?? `${p.name} — 3D printed${p.material ? ` in ${p.material}` : ""} by 3D PRINTMONK.`,
    path: `/products/${p.slug}`,
    image: p.images[0]?.url,
  });
}

const TECH: Record<string, string> = { fdm: "FDM (filament)", sla: "SLA (resin)", fdm_sla: "FDM + SLA", other: "Other" };

export default async function ProductPage({ params }: Props) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const [related, { reviews, distribution }, settings] = await Promise.all([getRelatedProducts(p), getReviews(p.id), getSettings()]);
  const d = p.dimensionsMm;
  const dims = d.length || d.width || d.height ? [d.length, d.width, d.height].map((n) => (n ? `${n}` : "–")).join(" × ") + " mm" : null;
  const crumbs = [
    { name: "Shop", path: "/" },
    ...(p.category?.parent ? [{ name: p.category.parent.name, path: `/category/${p.category.parent.slug}` }] : []),
    ...(p.category ? [{ name: p.category.name, path: `/category/${p.category.slug}` }] : []),
    { name: p.name, path: `/products/${p.slug}` },
  ];
  const specs: [string, string | null][] = [
    ["Material", p.material],
    ["Printing technology", p.printTechnology ? TECH[p.printTechnology] : null],
    ["Finish", p.finish],
    ["Colours", p.colors.length ? p.colors.join(", ") : null],
    ["Dimensions (L × W × H)", dims],
    ["Weight", p.weightG ? `${p.weightG} g` : null],
    ["Made to order", p.leadTimeDays ? `Printed in ~${p.leadTimeDays} day${p.leadTimeDays > 1 ? "s" : ""}` : "Ready to ship"],
    ...p.specifications.map((s) => [s.label, s.value] as [string, string]),
    ["HSN code", p.hsnCode],
  ];

  return (
    <div className="container-x py-8 lg:py-10">
      <JsonLd data={productJsonLd(p)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {i < crumbs.length - 1 ? <Link href={shopHref(c.path)} className="hover:text-text">{c.name}</Link> : <span aria-current="page" className="text-text">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={p.images} name={p.name} modelUrl={p.modelUrl} />
        <div>
          <div className="flex flex-wrap gap-2">
            {p.isNew && <Badge tone="info">New</Badge>}
            {p.isBestseller && <Badge tone="warning">Bestseller</Badge>}
            {p.customization.length > 0 && <Badge tone="accent">Personalisable</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{p.name}</h1>
          {p.ratingCount > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm hover:underline"><Stars value={p.ratingAvg} /> {p.ratingAvg.toFixed(1)} · {p.ratingCount} review{p.ratingCount > 1 ? "s" : ""}</a>
          )}
          {p.shortDescription && <p className="lead mt-4">{p.shortDescription}</p>}
          <div className="mt-8"><ProductPurchase product={p} /></div>
          {dims && <p className="mt-6 flex items-center gap-2 text-sm text-muted"><Ruler className="h-4 w-4" /> {dims}{p.weightG ? ` · ${p.weightG} g` : ""}{p.material ? ` · ${p.material}` : ""}</p>}
        </div>
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="desc">
          <h2 id="desc" className="text-2xl font-bold">About this product</h2>
          <div className="prose-body mt-4">{(p.description ?? p.shortDescription ?? "").split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
          <details className="card mt-8 p-5" open>
            <summary className="cursor-pointer font-bold">Shipping & delivery</summary>
            <p className="mt-3 whitespace-pre-line text-sm text-muted">{settings.policies.shipping}</p>
          </details>
          <details className="card mt-3 p-5">
            <summary className="cursor-pointer font-bold">Returns & refunds</summary>
            <p className="mt-3 whitespace-pre-line text-sm text-muted">{settings.policies.returns}</p>
            <Link href={shopHref("/policies/returns-refunds")} className="mt-2 inline-block text-sm font-semibold text-accent-ink underline">Full policy</Link>
          </details>
        </section>
        <section aria-labelledby="specs">
          <h2 id="specs" className="text-2xl font-bold">Specifications</h2>
          <dl className="card mt-4 divide-y divide-line">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 gap-4 px-5 py-3 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">3D printed items show fine layer lines and may vary slightly in colour between batches — that&apos;s part of their character.</p>
        </section>
      </div>

      <section id="reviews" aria-labelledby="rv" className="mt-16 scroll-mt-40">
        <h2 id="rv" className="text-2xl font-bold">Customer reviews</h2>
        <div className="mt-6 grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            {p.ratingCount > 0 ? (
              <>
                <p className="text-5xl font-extrabold">{p.ratingAvg.toFixed(1)}</p>
                <Stars value={p.ratingAvg} size="md" />
                <p className="mt-1 text-sm text-muted">Based on {p.ratingCount} review{p.ratingCount > 1 ? "s" : ""}</p>
                <ul className="mt-5 space-y-1.5">
                  {distribution.map((count, i) => {
                    const total = distribution.reduce((a, b) => a + b, 0) || 1;
                    return (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-6">{5 - i}★</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(count / total) * 100}%` }} /></span>
                        <span className="w-6 text-right text-muted">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-muted">No reviews yet. Be the first to share your thoughts.</p>
            )}
            <div className="mt-6"><ReviewForm productId={p.id} slug={p.slug} /></div>
          </div>
          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} />
                  {r.title && <p className="font-semibold">{r.title}</p>}
                </div>
                {r.body && <p className="mt-2 whitespace-pre-line text-muted">{r.body}</p>}
                <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                  {r.authorName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {r.verified && <span className="inline-flex items-center gap-1 font-semibold text-success"><BadgeCheck className="h-3.5 w-3.5" /> Verified purchase</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-16">
          <h2 id="related" className="text-2xl font-bold">You may also like</h2>
          <div className="mt-6"><ProductGrid products={related.slice(0, 4)} /></div>
        </section>
      )}
    </div>
  );
}
