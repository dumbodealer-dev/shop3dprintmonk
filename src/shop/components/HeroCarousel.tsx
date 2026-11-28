"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Floating3D } from "@/components/three/Floating3D";
import { shopHref } from "@/shop/config";
import type { Banner } from "@/shop/server/catalog";

const href = (u: string | null) => (!u ? shopHref("/products") : /^https?:\/\//.test(u) ? u : shopHref(u));

/** Homepage hero slides (managed in Admin → Content). Auto-advances unless the visitor prefers reduced motion. */
export function HeroCarousel({ slides }: { slides: Banner[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  const s = slides[i] ?? { id: "default", title: "3D printed. Delivered.", subtitle: "Functional and decorative products from our Delhi print farm.", ctaLabel: "Shop all products", ctaUrl: "/products", imageUrl: null, theme: "dark" as const, placement: "hero" };
  return (
    <section className="dark-band tech-grid relative overflow-hidden" aria-roledescription="carousel" aria-label="Featured" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {s.imageUrl && <Image key={s.imageUrl} src={s.imageUrl} alt="" fill priority sizes="100vw" className="animate-rise object-cover opacity-45" />}
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
      <div className="container-x relative grid min-h-[440px] items-center gap-10 py-16 lg:min-h-[520px] lg:grid-cols-[1.2fr_1fr]">
        <div key={s.id} className="animate-rise">
          <p className="eyebrow">3D PRINTMONK Shop</p>
          <h1 className="h-display mt-4 max-w-2xl">{s.title}</h1>
          {s.subtitle && <p className="lead mt-5 max-w-xl">{s.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={href(s.ctaUrl)} className="inline-flex h-13 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-ink-950 shadow-[0_10px_40px_-12px_rgb(255_106_19/0.8)] hover:bg-accent-soft">
              {s.ctaLabel ?? "Shop now"} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={shopHref("/products?sort=newest")} className="inline-flex h-13 items-center rounded-full border border-ink-600 px-7 font-semibold text-white hover:border-accent hover:text-accent">New arrivals</Link>
          </div>
        </div>
        {!s.imageUrl && (
          <div className="relative hidden h-80 lg:block" aria-hidden="true">
            <div className="absolute left-[10%] top-[8%]"><Floating3D shape="cube" size={150} /></div>
            <div className="absolute right-[12%] top-[30%]"><Floating3D shape="layers" size={130} delay={-2} /></div>
            <div className="absolute bottom-0 left-[38%]"><Floating3D shape="pyramid" size={110} delay={-4} /></div>
          </div>
        )}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((x, n) => (
            <button key={x.id} type="button" onClick={() => setI(n)} aria-label={`Show slide ${n + 1}`} aria-current={n === i} className={`h-2 rounded-full transition-all ${n === i ? "w-8 bg-accent" : "w-2 bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
