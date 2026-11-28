import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/shop/components/admin/kit";
import { ProductEditor } from "@/shop/components/admin/ProductEditor";
import { shopHref } from "@/shop/config";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { editorLookups, loadEditorProduct } from "@/shop/server/admin/editor-data";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("products");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [product, { categories, collections }] = await Promise.all([loadEditorProduct(id), editorLookups()]);
  if (!product) notFound();
  return (
    <>
      <PageTitle title={product.name} subtitle={<Link href={shopHref(`/admin/inventory?product=${id}`)} className="text-accent-ink underline">Stock history</Link>} />
      <ProductEditor key={id} initial={product} categories={categories} collections={collections} />
    </>
  );
}
