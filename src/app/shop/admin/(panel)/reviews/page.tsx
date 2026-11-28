import Link from "next/link";
import { PageTitle } from "@/shop/components/admin/kit";
import { ReviewModeration } from "@/shop/components/admin/Managers";
import { Badge, Stars } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { db } from "@/shop/server/db";

export const metadata = { title: "Reviews" };

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage("reviews");
  const status = (await searchParams).status ?? "pending";
  let q = db().from("shop_reviews").select("id, rating, title, body, status, verified_purchase, author_name, created_at, product:shop_products (id, name, slug)").order("created_at", { ascending: false }).limit(200);
  if (["pending", "approved", "rejected"].includes(status)) q = q.eq("status", status);
  const rows = ((await q).data ?? []) as unknown as { id: string; rating: number; title: string | null; body: string | null; status: string; verified_purchase: boolean; author_name: string; created_at: string; product: { id: string; name: string; slug: string } | null }[];
  return (
    <>
      <PageTitle title="Reviews" subtitle="Reviews appear on product pages once approved. Ratings update automatically." />
      <div className="mb-4 flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => <Link key={s} href={shopHref(`/admin/reviews?status=${s}`)} className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold capitalize ${status === s ? "bg-ink-900 text-white" : "border border-line bg-white"}`}>{s}</Link>)}
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2"><Stars value={r.rating} /><strong>{r.title}</strong>{r.verified_purchase && <Badge tone="success">Verified</Badge>}<Badge>{r.status}</Badge></div>
              <ReviewModeration id={r.id} status={r.status} />
            </div>
            {r.body && <p className="mt-2 text-sm text-muted">{r.body}</p>}
            <p className="mt-2 text-xs text-muted">{r.author_name} on <a href={shopHref(`/products/${r.product?.slug}`)} target="_blank" rel="noopener" className="underline">{r.product?.name}</a> · {new Date(r.created_at).toLocaleDateString("en-IN")}</p>
          </li>
        ))}
        {!rows.length && <li className="card p-8 text-center text-muted">No {status === "all" ? "" : status} reviews.</li>}
      </ul>
    </>
  );
}
