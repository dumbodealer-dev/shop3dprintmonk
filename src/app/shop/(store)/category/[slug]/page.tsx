import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, type SearchParams } from "@/shop/components/CatalogView";
import { shopHref } from "@/shop/config";
import { shopMetadata } from "@/shop/seo";
import { categoryScope, getCategoryBySlug } from "@/shop/server/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getCategoryBySlug((await params).slug);
  if (!found) notFound();
  const c = found.category;
  return shopMetadata({ title: `${c.name} — 3D printed`, description: c.description ?? `Shop 3D printed ${c.name.toLowerCase()} from 3D PRINTMONK, printed in Delhi and shipped across India.`, path: `/category/${c.slug}`, image: c.imageUrl });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const found = await getCategoryBySlug((await params).slug);
  if (!found) notFound();
  const { category: c, parent } = found;
  const siblings = parent ? parent.children : c.children;
  return (
    <CatalogView
      eyebrow={parent?.name ?? "Category"}
      title={c.name}
      description={c.description}
      crumbs={[{ name: "Shop", path: "/" }, ...(parent ? [{ name: parent.name, path: `/category/${parent.slug}` }] : []), { name: c.name, path: `/category/${c.slug}` }]}
      path={`/category/${c.slug}`}
      searchParams={await searchParams}
      scope={{ categoryIds: categoryScope(c) }}
      categoriesNav={[
        ...(parent ? [{ slug: parent.slug, name: `All ${parent.name}`, href: shopHref(`/category/${parent.slug}`), active: false }] : siblings.length ? [{ slug: c.slug, name: `All ${c.name}`, href: shopHref(`/category/${c.slug}`), active: true }] : []),
        ...siblings.map((k) => ({ slug: k.slug, name: k.name, href: shopHref(`/category/${k.slug}`), active: k.slug === c.slug })),
      ]}
    />
  );
}
