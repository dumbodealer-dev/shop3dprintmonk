/**
 * Real photography slots. Drop optimised WebP/AVIF files into /public/images
 * and set the paths here. While a slot is null the site shows a technical line
 * illustration instead — never a stock photo. CONFIRM
 */
export type Photo = { src: string; alt: string; width: number; height: number };

export const media = {
  /** Large hero photo of real finished prints (≈2000×1400). */
  hero: null as Photo | null,
  /** About page: workshop, printers, team, finished products. */
  about: [] as Photo[],
  /** Finishing page before/after pairs. */
  finishingBeforeAfter: [] as { before: Photo; after: Photo; caption: string }[],
};
