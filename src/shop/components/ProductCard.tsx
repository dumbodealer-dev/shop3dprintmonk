"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, Heart, LoaderCircle, Sparkles, X } from "lucide-react";
import { shopHref } from "@/shop/config";
import { discountPercent } from "@/shop/lib/money";
import type { ProductCardData, ProductDetail } from "@/shop/lib/types";
import { api } from "./api";
import { ProductGallery } from "./ProductGallery";
import { ProductPurchase } from "./ProductPurchase";
import { useShop } from "./ShopProvider";
import { Badge, Price, ProductPlaceholder, Stars } from "./ui";

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const { wishlist, toggleWishlist } = useShop();
  const [quick, setQuick] = useState(false);
  const href = shopHref(`/products/${p.slug}`);
  const pct = discountPercent(p.price, p.salePrice);
  const saved = wishlist.has(p.id);
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-2">
        <Link href={href} className="absolute inset-0" aria-label={p.name}>
          {p.imageUrl ? (
            <>
              <Image src={p.imageUrl} alt={p.imageAlt ?? p.name} fill priority={priority} sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw" className={`object-cover transition duration-500 group-hover:scale-[1.03] ${p.hoverImageUrl ? "group-hover:opacity-0" : ""}`} />
              {p.hoverImageUrl && <Image src={p.hoverImageUrl} alt="" fill sizes="(min-width:1280px) 300px, (min-width:768px) 33vw, 50vw" className="object-cover opacity-0 transition duration-500 group-hover:opacity-100" />}
            </>
          ) : (
            <ProductPlaceholder name={p.name} className="h-full w-full transition duration-500 group-hover:scale-[1.03]" />
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!p.inStock && <Badge tone="dark">Sold out</Badge>}
          {p.inStock && pct && <Badge tone="accent">{pct}% off</Badge>}
          {p.isNew && <Badge tone="info">New</Badge>}
          {p.isBestseller && <Badge tone="warning">Bestseller</Badge>}
        </div>
        <button type="button" onClick={() => toggleWishlist(p.id)} aria-pressed={saved} aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`} className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105">
          <Heart className={`h-4 w-4 ${saved ? "fill-accent text-accent" : "text-text"}`} />
        </button>
        <button type="button" onClick={() => setQuick(true)} className="absolute inset-x-3 bottom-3 inline-flex h-10 translate-y-2 items-center justify-center gap-2 rounded-full bg-white/95 text-sm font-semibold opacity-0 shadow-lg backdrop-blur transition focus:translate-y-0 focus:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
          <Eye className="h-4 w-4" /> Quick view
        </button>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        {p.material && <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">{p.material}{p.isCustomizable && " · Personalisable"}</p>}
        <h3 className="text-[0.95rem] font-semibold leading-snug">
          <Link href={href} className="hover:text-accent-ink">{p.name}</Link>
        </h3>
        {p.ratingCount > 0 && <Stars value={p.ratingAvg} count={p.ratingCount} />}
        <div className="mt-auto pt-1">
          <Price price={p.price} sale={p.salePrice} size="sm" from={p.maxPrice > (p.salePrice ?? p.price)} />
        </div>
      </div>
      {quick && <QuickView slug={p.slug} onClose={() => setQuick(false)} />}
    </article>
  );
}

function QuickView({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ product: ProductDetail }>(`/products/${slug}`)
      .then((r) => setProduct(r.product))
      .catch(() => setError("Couldn't load this product."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [slug, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Quick view">
      <button type="button" className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close quick view" />
      <div ref={ref} tabIndex={-1} className="relative max-h-[92dvh] w-full max-w-4xl animate-rise overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl focus:outline-none sm:rounded-3xl sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow hover:bg-paper" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        {error && <p className="py-10 text-center text-danger">{error}</p>}
        {!product && !error && (
          <div className="flex h-72 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-accent" /></div>
        )}
        {product && (
          <div className="grid gap-8 md:grid-cols-2">
            <ProductGallery images={product.images} name={product.name} compact />
            <div>
              {product.isNew && <p className="eyebrow"><Sparkles className="h-3 w-3" /> New</p>}
              <h2 className="mt-1 text-2xl font-extrabold">{product.name}</h2>
              {product.ratingCount > 0 && <div className="mt-2"><Stars value={product.ratingAvg} count={product.ratingCount} /></div>}
              {product.shortDescription && <p className="mt-3 text-muted">{product.shortDescription}</p>}
              <div className="mt-6"><ProductPurchase product={product} compact onAdded={onClose} /></div>
              <Link href={shopHref(`/products/${product.slug}`)} className="mt-5 inline-block text-sm font-semibold text-accent-ink underline underline-offset-4">View full details</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductGrid({ products, priorityFirst = 0 }: { products: ProductCardData[]; priorityFirst?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}><ProductCard p={p} priority={i < priorityFirst} /></li>
      ))}
    </ul>
  );
}
