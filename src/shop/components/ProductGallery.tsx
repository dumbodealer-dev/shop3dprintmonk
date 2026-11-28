"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Box, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { ProductImage } from "@/shop/lib/types";
import { ProductPlaceholder } from "./ui";

const Model3D = dynamic(() => import("./ModelPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-ink-300"><LoaderCircle className="h-6 w-6 animate-spin text-accent" /></div>
  ),
});

/** Image gallery with thumbnails, swipe-friendly arrows and an optional interactive 3D model tab. */
export function ProductGallery({ images, name, modelUrl, compact = false }: { images: ProductImage[]; name: string; modelUrl?: string | null; compact?: boolean }) {
  const [i, setI] = useState(0);
  const [show3d, setShow3d] = useState(false);
  const total = images.length;
  const current = images[i];
  const go = (d: number) => {
    setShow3d(false);
    setI((x) => (x + d + total) % total);
  };

  return (
    <div className={compact ? "" : "lg:sticky lg:top-36"}>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-2">
        {show3d && modelUrl ? (
          <div className="absolute inset-0 bg-ink-900"><Model3D url={modelUrl} /></div>
        ) : current ? (
          <Image key={current.url} src={current.url} alt={current.alt ?? `${name} — photo ${i + 1}`} fill priority={!compact && i === 0} sizes="(min-width:1024px) 50vw, 100vw" className="animate-rise object-cover" />
        ) : (
          <ProductPlaceholder name={name} className="h-full w-full" />
        )}
        {total > 1 && !show3d && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/80 px-2.5 py-1 font-mono text-xs text-white">{i + 1}/{total}</span>
          </>
        )}
      </div>
      {(total > 1 || modelUrl) && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, n) => (
            <button key={img.url} type="button" onClick={() => { setShow3d(false); setI(n); }} aria-label={`Show photo ${n + 1}`} aria-current={!show3d && n === i} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${!show3d && n === i ? "border-accent" : "border-transparent opacity-80 hover:opacity-100"}`}>
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
          {modelUrl && (
            <button type="button" onClick={() => setShow3d(true)} aria-pressed={show3d} className={`inline-flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-ink-900 text-[0.65rem] font-bold uppercase text-accent sm:h-20 sm:w-20 ${show3d ? "border-accent" : "border-transparent"}`}>
              <Box className="h-5 w-5" /> 3D
            </button>
          )}
        </div>
      )}
    </div>
  );
}
