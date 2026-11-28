import Link from "next/link";
import { Heart } from "lucide-react";
import { shopHref } from "@/shop/config";
import { ProductGrid } from "@/shop/components/ProductCard";
import { EmptyState } from "@/shop/components/ui";
import { noIndex } from "@/shop/seo";
import { getProductsByIds } from "@/shop/server/catalog";
import { wishlistIds } from "@/shop/server/wishlist";

export const metadata = noIndex("Wishlist");
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const products = await getProductsByIds(await wishlistIds());
  return (
    <div className="container-x py-10">
      <h1 className="h-section">Your wishlist</h1>
      <p className="mt-2 text-muted">Products you&apos;ve saved. <Link href={shopHref("/account/login?next=/wishlist")} className="font-semibold text-accent-ink underline">Sign in</Link> to keep it across devices.</p>
      <div className="mt-8">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState icon={<Heart className="h-7 w-7" />} title="Nothing saved yet" action={<Link href={shopHref("/products")} className="inline-flex h-12 items-center rounded-full bg-ink-900 px-7 font-semibold text-white">Browse products</Link>}>
            Tap the heart on any product to save it for later.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
