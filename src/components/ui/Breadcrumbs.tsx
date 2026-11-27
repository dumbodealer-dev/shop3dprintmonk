import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { business } from "@/config/business";
import { JsonLd } from "./JsonLd";

export type Crumb = { href: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ href: "/", label: "Home" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-ink-300">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-white">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-white">{c.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: new URL(c.href, business.siteUrl).toString(),
          })),
        }}
      />
    </>
  );
}
