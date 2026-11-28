import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView, type SearchParams } from "@/shop/components/CatalogView";
import { shopMetadata } from "@/shop/seo";
import { getCollectionBySlug } from "@/shop/server/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCollectionBySlug((await params).slug);
  if (!c) notFound();
  return shopMetadata({ title: c.name, description: c.description ?? `${c.name} — a curated collection of 3D printed products.`, path: `/collections/${c.slug}`, image: c.imageUrl });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const c = await getCollectionBySlug((await params).slug);
  if (!c) notFound();
  return (
    <CatalogView
      eyebrow={c.isSeasonal ? "Seasonal collection" : "Collection"}
      title={c.name}
      description={c.description}
      crumbs={[{ name: "Shop", path: "/" }, { name: c.name, path: `/collections/${c.slug}` }]}
      path={`/collections/${c.slug}`}
      searchParams={await searchParams}
      scope={{ collectionId: c.id }}
    />
  );
}
