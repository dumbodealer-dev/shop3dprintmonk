"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="h-section">Something went wrong</h1>
      <p className="lead mt-4 max-w-md">Please try again. If the problem continues, contact us and we&apos;ll help directly.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="h-11 rounded-full bg-ink-900 px-5 font-semibold text-white hover:bg-ink-700">Try again</button>
        <Link href="/contact" className="inline-flex h-11 items-center rounded-full border border-line bg-white px-5 font-semibold">Contact us</Link>
      </div>
    </section>
  );
}
