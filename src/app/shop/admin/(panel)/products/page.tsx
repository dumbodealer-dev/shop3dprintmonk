import Link from "next/link";
import { Plus } from "lucide-react";
import { PageTitle } from "@/shop/components/admin/kit";
import { ProductTable, type ProductRow } from "@/shop/components/admin/ProductTable";
import { shopHref } from "@/shop/config";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  await requireAdminPage("products");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = db()
    .from("shop_products")
    .select("id, name, slug, status, publish_at, is_featured, is_bestseller, category:shop_categories (name), images:shop_product_images (url, sort_order), variants:shop_variants (price, sale_price, stock, track_inventory)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (sp.q) q = q.ilike("name", `%${sp.q.replace(/[%_,()]/g, "")}%`);
  if (sp.status && ["draft", "active", "archived"].includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.category && /^[0-9a-f-]{36}$/.test(sp.category)) q = q.eq("category_id", sp.category);
  const [{ data, count }, { data: cats }] = await Promise.all([q, db().from("shop_categories").select("id, name").order("sort_order")]);
  const rows: ProductRow[] = ((data ?? []) as unknown as {
    id: string; name: string; slug: string; status: string; publish_at: string | null; is_featured: boolean; is_bestseller: boolean;
    category: { name: string } | null; images: { url: string; sort_order: number }[]; variants: { price: number; sale_price: number | null; stock: number; track_inventory: boolean }[];
  }[]).map((p) => ({
    id: p.id, name: p.name, slug: p.slug, status: p.status, publishAt: p.publish_at, category: p.category?.name ?? null, isFeatured: p.is_featured, isBestseller: p.is_bestseller,
    image: p.images.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    minPrice: Math.min(...p.variants.map((v) => Number(v.sale_price ?? v.price)), Infinity) || 0,
    stock: p.variants.reduce((s, v) => s + v.stock, 0), tracked: p.variants.some((v) => v.track_inventory), variants: p.variants.length,
  }));
  const pages = Math.ceil((count ?? 0) / 50);
  return (
    <>
      <PageTitle title="Products" subtitle={`${count ?? 0} products`} actions={<Link href={shopHref("/admin/products/new")} className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink-950 hover:bg-accent-soft"><Plus className="h-4 w-4" /> Add product</Link>} />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search products" className="input h-10 w-64 py-0 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-10 w-40 py-0 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <select name="category" defaultValue={sp.category ?? ""} className="input h-10 w-48 py-0 text-sm"><option value="">All categories</option>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="h-10 rounded-full bg-ink-900 px-5 text-sm font-semibold text-white">Filter</button>
      </form>
      <ProductTable rows={rows} />
      {pages > 1 && (
        <nav className="mt-4 flex gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={shopHref(`/admin/products?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(n) })}`)} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm ${n === page ? "bg-ink-900 text-white" : "border border-line bg-white"}`}>{n}</Link>
          ))}
        </nav>
      )}
    </>
  );
}
