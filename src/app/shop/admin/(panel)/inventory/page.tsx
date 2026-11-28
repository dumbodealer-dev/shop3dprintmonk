import Link from "next/link";
import { PageTitle } from "@/shop/components/admin/kit";
import { StockAdjuster } from "@/shop/components/admin/Managers";
import { Badge } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Inventory" };

type V = { id: string; sku: string; title: string; stock: number; low_stock_threshold: number; track_inventory: boolean; is_active: boolean; product: { id: string; name: string; status: string } | null };

export default async function InventoryAdmin({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; product?: string }> }) {
  await requireAdminPage("inventory");
  const sp = await searchParams;
  let q = db().from("shop_variants").select("id, sku, title, stock, low_stock_threshold, track_inventory, is_active, product:shop_products!inner (id, name, status)").order("stock", { ascending: true }).limit(500);
  if (sp.q) q = q.ilike("sku", `%${sp.q.replace(/[%_,()]/g, "")}%`);
  if (sp.product && /^[0-9a-f-]{36}$/.test(sp.product)) q = q.eq("product_id", sp.product);
  q = q.neq("product.status", "archived");
  let rows = ((await q).data ?? []) as unknown as V[];
  if (sp.filter === "low") rows = rows.filter((v) => v.track_inventory && v.stock <= v.low_stock_threshold);
  if (sp.filter === "out") rows = rows.filter((v) => v.track_inventory && v.stock === 0);

  let mq = db().from("shop_inventory_movements").select("id, delta, stock_after, reason, note, created_at, variant:shop_variants (sku), admin:shop_admins (full_name)").order("created_at", { ascending: false }).limit(50);
  if (sp.product && /^[0-9a-f-]{36}$/.test(sp.product)) mq = mq.in("variant_id", rows.map((r) => r.id));
  const movements = ((await mq).data ?? []) as unknown as { id: string; delta: number; stock_after: number; reason: string; note: string | null; created_at: string; variant: { sku: string } | null; admin: { full_name: string } | null }[];

  return (
    <>
      <PageTitle title="Inventory" subtitle="Stock is reserved when an order is placed and returned automatically for cancelled, expired or refunded (restocked) orders." />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Search SKU" className="input h-10 w-56 py-0 text-sm" />
        {[["", "All"], ["low", "Low stock"], ["out", "Out of stock"]].map(([k, l]) => (
          <Link key={k} href={shopHref(`/admin/inventory${k ? `?filter=${k}` : ""}`)} className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${(sp.filter ?? "") === k ? "bg-ink-900 text-white" : "border border-line bg-white"}`}>{l}</Link>
        ))}
        <button className="h-10 rounded-full border border-line bg-white px-4 text-sm font-semibold">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">Product / variant</th><th className="p-3">SKU</th><th className="p-3 text-right">In stock</th><th className="p-3">Adjust</th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="p-3"><Link href={shopHref(`/admin/products/${v.product?.id}`)} className="font-semibold hover:text-accent-ink">{v.product?.name}</Link>{v.title !== "Default" && <span className="block text-xs text-muted">{v.title}</span>}</td>
                <td className="p-3 font-mono text-xs">{v.sku}</td>
                <td className="p-3 text-right">
                  {!v.track_inventory ? <span className="text-muted">Not tracked</span> : <span className={`font-bold ${v.stock === 0 ? "text-danger" : v.stock <= v.low_stock_threshold ? "text-warning" : ""}`}>{v.stock}</span>}
                  {v.track_inventory && v.stock <= v.low_stock_threshold && <Badge tone={v.stock === 0 ? "danger" : "warning"} className="ml-2">{v.stock === 0 ? "Out" : "Low"}</Badge>}
                </td>
                <td className="p-3">{v.track_inventory && <StockAdjuster variantId={v.id} stock={v.stock} />}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="p-8 text-center text-muted">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
      <h2 className="mt-8 text-lg font-bold">Recent stock movements</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-paper text-left text-xs uppercase text-muted"><tr><th className="p-3">When</th><th className="p-3">SKU</th><th className="p-3">Reason</th><th className="p-3 text-right">Change</th><th className="p-3 text-right">After</th><th className="p-3">By / note</th></tr></thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="p-3 text-muted">{new Date(m.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="p-3 font-mono text-xs">{m.variant?.sku}</td>
                <td className="p-3 capitalize">{m.reason.replace(/_/g, " ")}</td>
                <td className={`p-3 text-right font-semibold ${m.delta < 0 ? "text-danger" : "text-success"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</td>
                <td className="p-3 text-right">{m.stock_after}</td>
                <td className="p-3 text-muted">{[m.admin?.full_name, m.note].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
