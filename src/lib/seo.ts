import type { Metadata } from "next";
import { business } from "@/config/business";

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: business.name, locale: "en_IN", type },
    twitter: { card: "summary_large_image", title, description },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/** LocalBusiness schema only when the address is verified; otherwise a plain Organization. */
export function organizationJsonLd() {
  const a = business.address;
  const base = {
    "@context": "https://schema.org",
    "@id": `${business.siteUrl}/#organization`,
    name: business.name,
    ...(business.legalName ? { legalName: business.legalName } : {}),
    url: business.siteUrl,
    description: "Custom FDM and SLA 3D printing, rapid prototyping, small-batch manufacturing, 3D design and finishing.",
    ...(business.contact.phone ? { telephone: business.contact.phone } : {}),
    ...(business.contact.email ? { email: business.contact.email } : {}),
    ...(business.social.instagram ? { sameAs: [business.social.instagram] } : {}),
    logo: new URL(business.logoFull, business.siteUrl).toString(),
    areaServed: [
      { "@type": "AdministrativeArea", name: "Delhi NCR" },
      { "@type": "Country", name: "India" },
      ...(business.policies.internationalShipping ? [{ "@type": "Place", name: "Worldwide" }] : []),
    ],
  };
  if (!a.verified || !a.street) return { ...base, "@type": "Organization" };
  return {
    ...base,
    "@type": "LocalBusiness",
    address: {
      "@type": "PostalAddress",
      streetAddress: a.street,
      addressLocality: a.locality ?? a.city,
      addressRegion: a.region,
      postalCode: a.postalCode ?? undefined,
      addressCountry: a.country,
    },
    ...(a.mapsUrl ? { hasMap: a.mapsUrl } : {}),
    currenciesAccepted: "INR",
    image: new URL(business.logoFull, business.siteUrl).toString(),
    ...(business.open24x7
      ? {
          openingHoursSpecification: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "00:00",
            closes: "23:59",
          },
        }
      : {}),
  };
}

export function serviceJsonLd(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: "3D printing",
    url: new URL(path, business.siteUrl).toString(),
    provider: { "@id": `${business.siteUrl}/#organization`, name: business.name },
    areaServed: [{ "@type": "AdministrativeArea", name: "Delhi NCR" }, { "@type": "Country", name: "India" }],
  };
}
