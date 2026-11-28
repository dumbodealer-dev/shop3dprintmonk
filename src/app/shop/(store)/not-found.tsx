import Link from "next/link";
import { shopHref } from "@/shop/config";
import { SearchBar } from "@/shop/components/SearchBar";

export default function ShopNotFound() {
  return (
    <section className="dark-band tech-grid">
      <div className="container-x flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-mono text-sm tracking-[0.3em] text-accent">ERROR 404</p>
        <h1 className="h-display mt-4">This product isn&apos;t on the print bed.</h1>
        <p className="lead mt-5 max-w-lg">It may have sold out or moved. Try searching instead:</p>
        <div className="mt-8 w-full max-w-md"><SearchBar /></div>
        <Link href={shopHref("/products")} className="mt-6 text-sm font-semibold text-accent underline underline-offset-4">Browse all products</Link>
      </div>
    </section>
  );
}
