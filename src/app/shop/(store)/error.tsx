"use client";

import { useEffect } from "react";
import Link from "next/link";
import { shopHref } from "@/shop/config";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h-section mt-3">We hit a snag loading this page</h1>
      <p className="lead mt-4 max-w-md">Please try again. Your cart is safe.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="h-11 rounded-full bg-ink-900 px-5 font-semibold text-white hover:bg-ink-700">Try again</button>
        <Link href={shopHref("/")} className="inline-flex h-11 items-center rounded-full border border-line bg-white px-5 font-semibold">Shop home</Link>
      </div>
    </section>
  );
}
