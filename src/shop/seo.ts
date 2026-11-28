import type { Metadata } from "next";
import { business } from "@/config/business";
import { shopUrl } from "./config";
import type { ProductDetail } from "./lib/types";

/** Canonical URLs always point at the public storefront URL (NEXT_PUBLIC_SHOP_URL), so the move to the subdomain keeps SEO intact. */
export function shopMetadata({ title, description, path, image, noIndex = false, type = "website" }: { title: string; description: string; path: string; image?: string | null; noIndex?: boolean; type?: "website" | "article" }): Metadata {
  const url = shopUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: `${business.name} Shop`, locale: "en_IN", type, ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

export const noIndex = (title: string): Metadata => ({ title, robots: { index: false, follow: false } });

/** schema.org Product with offers (one per variant) and aggregate rating. */
export function productJsonLd(p: ProductDetail) {
  const url = shopUrl(`/products/${p.slug}`);
  const offers = p.variants.map((v) => ({
    "@type": "Offer",
    sku: v.sku,
    url,
    priceCurrency: "INR",
    price: (v.salePrice ?? v.price).toFixed(2),
    availability: v.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: business.name },
    shippingDetails: { "@type": "OfferShippingDetails", shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" } },
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.seoDescription ?? p.shortDescription ?? p.description?.slice(0, 300) ?? undefined,
    sku: p.variants[0]?.sku,
    url,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: business.name },
    material: p.material ?? undefined,
    category: p.category?.name,
    ...(p.weightG ? { weight: { "@type": "QuantitativeValue", value: p.weightG, unitCode: "GRM" } } : {}),
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } } : {}),
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.min(...p.variants.map((v) => v.salePrice ?? v.price)).toFixed(2), highPrice: Math.max(...p.variants.map((v) => v.salePrice ?? v.price)).toFixed(2), offerCount: offers.length, offers },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: shopUrl(it.path) })),
  };
}
