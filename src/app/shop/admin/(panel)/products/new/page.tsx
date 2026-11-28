import { PageTitle } from "@/shop/components/admin/kit";
import { blankVariant, ProductEditor } from "@/shop/components/admin/ProductEditor";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { editorLookups } from "@/shop/server/admin/editor-data";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireAdminPage("products");
  const { categories, collections } = await editorLookups();
  return (
    <>
      <PageTitle title="Add product" />
      <ProductEditor
        categories={categories}
        collections={collections}
        initial={{
          name: "", slug: "", shortDescription: "", description: "", categoryId: "", status: "draft", publishAt: "", printTechnology: "fdm", material: "PLA", finish: "", colors: "",
          lengthMm: "", widthMm: "", heightMm: "", weightG: "", hsnCode: "3926", gstRate: "18", specifications: [], customization: [], leadTimeDays: "2",
          isFeatured: false, isBestseller: false, isNew: true, tags: "", modelUrl: "", seoTitle: "", seoDescription: "", images: [], variants: [blankVariant()], collectionIds: [], optionNames: [],
        }}
      />
    </>
  );
}
