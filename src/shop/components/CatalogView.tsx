import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, PackageSearch } from "lucide-react";
import { JsonLd } from "@/components/ui/JsonLd";
import { shopHref } from "@/shop/config";
import { breadcrumbJsonLd } from "@/shop/seo";
import { getMaterials, listProducts, SORTS, type CatalogParams, type SortKey } from "@/shop/server/catalog";
import { CatalogFilters } from "./CatalogFilters";
import { ProductGrid } from "./ProductCard";
import { EmptyState } from "./ui";

export type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseCatalogParams(sp: SearchParams): CatalogParams {
  const n = (v: string | undefined) => (v && /^\d{1,7}$/.test(v) ? Number(v) : undefined);
  const sort = one(sp.sort);
  const tech = one(sp.tech);
  return {
    q: one(sp.q)?.slice(0, 100),
    sort: sort && sort in SORTS ? (sort as SortKey) : undefined,
    page: n(one(sp.page)) ?? 1,
    minPrice: n(one(sp.min)),
    maxPrice: n(one(sp.max)),
    inStock: one(sp.stock) === "1",
    onSale: one(sp.sale) === "1",
    material: one(sp.material)?.slice(0, 60),
    technology: tech === "fdm" || tech === "sla" ? tech : undefined,
  };
}

export async function CatalogView({
  title,
  description,
  eyebrow = "Shop",
  crumbs,
  path,
  searchParams,
  scope = {},
  categoriesNav,
}: {
  title: string;
  description?: string | null;
  eyebrow?: string;
  crumbs: { name: string; path: string }[];
  path: string;
  searchParams: SearchParams;
  scope?: Pick<CatalogParams, "categoryIds" | "collectionId">;
  categoriesNav?: { slug: string; name: string; href: string; active: boolean }[];
}) {
  const params = { ...parseCatalogParams(searchParams), ...scope, perPage: 24 };
  const [result, materials] = await Promise.all([listProducts(params), getMaterials()]);
  const qs = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") u.set(k, v);
    if (page > 1) u.set("page", String(page));
    return `${shopHref(path)}${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="container-x py-8 lg:py-10">
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
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <header className="mt-4 max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h-section mt-2">{params.q ? <>Results for “{params.q}”</> : title}</h1>
        {description && !params.q && <p className="lead mt-3">{description}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <Suspense>
          <CatalogFilters part="sidebar" sorts={SORTS} materials={materials} categories={categoriesNav} />
        </Suspense>
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-sm text-muted" aria-live="polite">{result.total} product{result.total === 1 ? "" : "s"}</p>
            <div className="flex-1">
              <Suspense>
                <CatalogFilters part="toolbar" sorts={SORTS} materials={materials} categories={categoriesNav} />
              </Suspense>
            </div>
          </div>
          {result.items.length ? (
            <ProductGrid products={result.items} priorityFirst={4} />
          ) : (
            <EmptyState icon={<PackageSearch className="h-7 w-7" />} title="No products match" action={<Link href={shopHref("/products")} className="inline-flex h-11 items-center rounded-full bg-ink-900 px-6 font-semibold text-white">Clear search & filters</Link>}>
              Try different words or remove a filter. Looking for something custom? <a className="font-semibold text-accent-ink underline" href="/get-a-quote">Request a custom print</a>.
            </EmptyState>
          )}
          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {result.page > 1 && <Link href={qs(result.page - 1)} rel="prev" className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold hover:bg-paper">Previous</Link>}
              {Array.from({ length: result.pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === result.pages || Math.abs(n - result.page) <= 1)
                .map((n, i, arr) => (
                  <span key={n} className="flex items-center gap-2">
                    {i > 0 && n - arr[i - 1] > 1 && <span className="text-muted">…</span>}
                    <Link href={qs(n)} aria-current={n === result.page ? "page" : undefined} className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold ${n === result.page ? "bg-ink-900 text-white" : "border border-line bg-white hover:bg-paper"}`}>{n}</Link>
                  </span>
                ))}
              {result.page < result.pages && <Link href={qs(result.page + 1)} rel="next" className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold hover:bg-paper">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
