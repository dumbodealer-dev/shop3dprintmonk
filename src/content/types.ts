export type Technology = "fdm" | "sla";
export type Availability = "in_stock" | "on_request" | "unavailable";

export interface Material {
  slug: string;
  name: string;
  technology: Technology;
  family: string;
  summary: string;
  description: string;
  strength?: string | null;
  flexibility?: string | null;
  heatResistance?: string | null;
  surfaceFinish?: string | null;
  applications: string[];
  colors?: string | null;
  /** 1 = economical, 2 = moderate, 3 = premium (relative, indicative only) */
  costLevel?: 1 | 2 | 3 | null;
  limitations: string[];
  availability: Availability;
  priceNote?: string | null;
  /** INR per gram for instant estimates; null → src/config/pricing.ts default. */
  ratePerGram?: number | null;
  density?: number | null;
  sortOrder: number;
}

export interface PortfolioImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const PORTFOLIO_CATEGORIES = [
  "Engineering",
  "Miniatures",
  "Functional Parts",
  "Corporate Projects",
  "Decorative Models",
  "Resin Prints",
  "Bulk Orders",
] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export interface PortfolioProject {
  slug: string;
  title: string;
  description: string;
  categories: PortfolioCategory[];
  technology: "fdm" | "sla" | "fdm_sla";
  material?: string | null;
  quantity?: string | null;
  finishing?: string | null;
  intendedUse?: string | null;
  images: PortfolioImage[];
  featured: boolean;
  sortOrder: number;
}
