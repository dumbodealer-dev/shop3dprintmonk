import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICY_PAGES, type PolicySlug } from "@/shop/lib/settings-schema";
import { shopMetadata } from "@/shop/seo";
import { getSettings } from "@/shop/server/settings";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(POLICY_PAGES).map((slug) => ({ slug }));
}
export const dynamicParams = false;
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = POLICY_PAGES[(await params).slug as PolicySlug];
  return page ? shopMetadata({ title: page.title, description: `${page.title} for the 3D PRINTMONK Shop.`, path: `/policies/${(await params).slug}` }) : {};
}

export default async function PolicyPage({ params }: Props) {
  const page = POLICY_PAGES[(await params).slug as PolicySlug];
  if (!page) notFound();
  const text = (await getSettings()).policies[page.key];
  return (
    <div className="container-x max-w-3xl py-12">
      <p className="eyebrow">Shop policies</p>
      <h1 className="h-section mt-2">{page.title}</h1>
      <div className="prose-body mt-8">{text.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
    </div>
  );
}
