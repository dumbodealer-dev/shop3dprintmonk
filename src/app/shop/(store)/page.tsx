import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Boxes, Paintbrush, ShieldCheck, Truck } from "lucide-react";
import { shopHref } from "@/shop/config";
import { HeroCarousel } from "@/shop/components/HeroCarousel";
import { NewsletterForm } from "@/shop/components/NewsletterForm";
import { ProductCard, ProductGrid } from "@/shop/components/ProductCard";
import { ProductPlaceholder } from "@/shop/components/ui";
import { shopMetadata } from "@/shop/seo";
import { getBanners, getCategories, getCollections, listProducts } from "@/shop/server/catalog";
import { getSettings } from "@/shop/server/settings";
import type { ProductCardData } from "@/shop/lib/types";

export const revalidate = 60;

export const metadata = shopMetadata({
  title: "3D PRINTMONK Shop — 3D printed products made in India",
  description: "Shop 3D printed planters, lamps, desk organisers, toys, miniatures and personalised gifts — printed to order in Delhi and delivered across India.",
  path: "/",
});

const bannerHref = (u: string | null) => (!u ? shopHref("/products") : /^https?:\/\//.test(u) ? u : shopHref(u));

export default async function ShopHome() {
  const settings = await getSettings();
  const h = settings.homepage;
  const [banners, categories, collections, featured, bestsellers, newest] = await Promise.all([
    getBanners(),
    getCategories(),
    getCollections(true),
    listProducts({ sort: "popular", perPage: 24 }),
    listProducts({ sort: "popular", perPage: 8 }),
    listProducts({ sort: "newest", perPage: 8 }),
  ]);
  const featuredItems = featured.items.filter((p) => p.isBestseller || p.isNew).slice(0, 8);
  const best = bestsellers.items.filter((p) => p.isBestseller);
  const collectionProducts = await Promise.all(collections.slice(0, 2).map((c) => listProducts({ collectionId: c.id, perPage: 4 })));

  return (
    <>
      <HeroCarousel slides={banners.filter((b) => b.placement === "hero")} />

      <section className="border-b border-line bg-white">
        <ul className="container-x grid grid-cols-2 gap-4 py-6 text-sm lg:grid-cols-4">
          {[
            { icon: Boxes, t: "Printed in our Delhi farm", d: "Every piece made & checked in-house" },
            { icon: Truck, t: "Ships across India", d: settings.shipping.methods[0]?.freeAbove ? `Free shipping over ₹${settings.shipping.methods[0].freeAbove}` : "Tracked delivery" },
            { icon: Paintbrush, t: "Personalise it", d: "Names, colours & messages" },
            { icon: ShieldCheck, t: "Secure payments", d: `UPI, cards, net banking${settings.payments.codEnabled ? ", COD" : ""}` },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-accent-ink"><Icon className="h-5 w-5" /></span>
              <span><span className="block font-semibold">{t}</span><span className="text-muted">{d}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {h.showCategories && categories.length > 0 && (
        <section className="container-x section pb-0">
          <SectionHead eyebrow="Browse" title="Shop by category" href={shopHref("/products")} cta="All products" />
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={shopHref(`/category/${c.slug}`)} className="group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-[4/3]">
                    {c.imageUrl ? <Image src={c.imageUrl} alt="" fill sizes="(min-width:1024px) 20vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" /> : <ProductPlaceholder name={c.name} className="h-full w-full" />}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <span className="font-semibold">{c.name}</span>
                    <ArrowRight className="h-4 w-4 text-accent-ink transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {h.showFeatured && featuredItems.length > 0 && (
        <Rail eyebrow="Hand-picked" title={h.featuredTitle} items={featuredItems} href={shopHref("/products")} />
      )}

      {h.showPromos && banners.some((b) => b.placement === "promo") && (
        <section className="container-x section pb-0">
          <div className="grid gap-4 md:grid-cols-2">
            {banners
              .filter((b) => b.placement === "promo")
              .slice(0, 4)
              .map((b) => (
                <Link key={b.id} href={bannerHref(b.ctaUrl)} className={`group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-7 ${b.theme === "accent" ? "bg-accent text-ink-950" : b.theme === "light" ? "border border-line bg-white" : "dark-band tech-grid"}`}>
                  {b.imageUrl && <Image src={b.imageUrl} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover opacity-40 transition duration-700 group-hover:scale-105" />}
                  <BadgePercent className="relative h-7 w-7 opacity-80" />
                  <h2 className="relative mt-3 text-2xl font-extrabold">{b.title}</h2>
                  {b.subtitle && <p className="relative mt-1 max-w-md opacity-80">{b.subtitle}</p>}
                  {b.ctaLabel && <span className="relative mt-4 inline-flex items-center gap-1 font-semibold underline underline-offset-4">{b.ctaLabel} <ArrowRight className="h-4 w-4" /></span>}
                </Link>
              ))}
          </div>
        </section>
      )}

      {h.showBestsellers && best.length > 0 && <Rail eyebrow="Customer favourites" title="Bestsellers" items={best} href={shopHref("/products?sort=popular")} />}

      {h.showCollections &&
        collections.slice(0, 2).map((c, n) =>
          collectionProducts[n].items.length ? (
            <section key={c.id} className="container-x section pb-0">
              <div className="grid items-start gap-8 lg:grid-cols-[1fr_2.5fr]">
                <div className="dark-band tech-grid rounded-[var(--radius-card)] p-8">
                  <p className="eyebrow">{c.isSeasonal ? "Seasonal collection" : "Collection"}</p>
                  <h2 className="mt-3 text-2xl font-extrabold">{c.name}</h2>
                  {c.description && <p className="mt-2 text-ink-300">{c.description}</p>}
                  <Link href={shopHref(`/collections/${c.slug}`)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-ink-950 hover:bg-accent-soft">Explore <ArrowRight className="h-4 w-4" /></Link>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4"><RailItems items={collectionProducts[n].items} /></ul>
              </div>
            </section>
          ) : null,
        )}

      {h.showNewArrivals && newest.items.length > 0 && <Rail eyebrow="Just off the print bed" title="New arrivals" items={newest.items} href={shopHref("/products?sort=newest")} />}

      {featured.total === 0 && (
        <section className="container-x section">
          <div className="card p-10 text-center">
            <h2 className="text-xl font-bold">Products are on their way</h2>
            <p className="mt-2 text-muted">The catalogue is being set up. Meanwhile, we print custom parts to order.</p>
          </div>
        </section>
      )}

      {h.showNewsletter && (
        <section className="container-x section pb-0">
          <div className="dark-band tech-grid flex flex-col gap-6 overflow-hidden rounded-[var(--radius-card)] px-6 py-10 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Newsletter</p>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{h.newsletterTitle}</h2>
              <p className="mt-2 max-w-lg text-ink-300">{h.newsletterText}</p>
            </div>
            <NewsletterForm />
          </div>
        </section>
      )}
    </>
  );
}

function SectionHead({ eyebrow, title, href, cta = "View all" }: { eyebrow: string; title: string; href: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="h-section mt-2">{title}</h2>
      </div>
      <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-ink hover:underline">{cta} <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}

function Rail({ eyebrow, title, items, href }: { eyebrow: string; title: string; items: ProductCardData[]; href: string }) {
  return (
    <section className="container-x section pb-0">
      <SectionHead eyebrow={eyebrow} title={title} href={href} />
      <div className="mt-8"><ProductGrid products={items.slice(0, 8)} /></div>
    </section>
  );
}

function RailItems({ items }: { items: ProductCardData[] }) {
  return (
    <>
      {items.map((p) => (
        <li key={p.id}><ProductCard p={p} /></li>
      ))}
    </>
  );
}
