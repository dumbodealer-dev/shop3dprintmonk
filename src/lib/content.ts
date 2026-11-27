import "server-only";
import { unstable_cache } from "next/cache";
import { defaultMaterials } from "@/content/materials";
import { localPortfolio } from "@/content/portfolio";
import type { Material, PortfolioProject } from "@/content/types";
import { getSupabaseAdmin } from "./supabase";

/**
 * Editable content: read from Supabase when configured, otherwise fall back
 * to the defaults in /src/content. Cached and refreshed every 5 minutes, or
 * immediately via POST /api/revalidate.
 */
export const CONTENT_TAG = "site-content";

type MaterialRow = {
  slug: string; name: string; technology: "fdm" | "sla"; family: string; summary: string; description: string;
  strength: string | null; flexibility: string | null; heat_resistance: string | null; surface_finish: string | null;
  applications: string[]; colors: string | null; cost_level: 1 | 2 | 3 | null; limitations: string[];
  availability: Material["availability"]; price_note: string | null; sort_order: number;
  rate_per_gram_inr: number | string | null; density_g_cm3: number | string | null;
};

const fetchMaterials = unstable_cache(
  async (): Promise<Material[]> => {
    const db = getSupabaseAdmin();
    if (!db) return defaultMaterials;
    const { data, error } = await db
      .from("materials")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("[content] materials query failed:", error.message);
      return defaultMaterials;
    }
    if (!data?.length) return defaultMaterials;
    return (data as MaterialRow[]).map((r) => ({
      slug: r.slug,
      name: r.name,
      technology: r.technology,
      family: r.family,
      summary: r.summary,
      description: r.description,
      strength: r.strength,
      flexibility: r.flexibility,
      heatResistance: r.heat_resistance,
      surfaceFinish: r.surface_finish,
      applications: r.applications ?? [],
      colors: r.colors,
      costLevel: r.cost_level,
      limitations: r.limitations ?? [],
      availability: r.availability,
      priceNote: r.price_note,
      ratePerGram: r.rate_per_gram_inr == null ? null : Number(r.rate_per_gram_inr),
      density: r.density_g_cm3 == null ? null : Number(r.density_g_cm3),
      sortOrder: r.sort_order,
    }));
  },
  ["materials"],
  { revalidate: 300, tags: [CONTENT_TAG] },
);

type ProjectRow = {
  slug: string; title: string; description: string; categories: PortfolioProject["categories"];
  technology: PortfolioProject["technology"]; material: string | null; quantity: string | null; finishing: string | null;
  intended_use: string | null; images: PortfolioProject["images"] | null; is_featured: boolean; sort_order: number;
};

const fetchProjects = unstable_cache(
  async (): Promise<PortfolioProject[]> => {
    const db = getSupabaseAdmin();
    let remote: PortfolioProject[] = [];
    if (db) {
      const { data, error } = await db
        .from("portfolio_projects")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) console.error("[content] portfolio query failed:", error.message);
      remote = ((data ?? []) as ProjectRow[]).map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description,
        categories: r.categories ?? [],
        technology: r.technology,
        material: r.material,
        quantity: r.quantity,
        finishing: r.finishing,
        intendedUse: r.intended_use,
        images: Array.isArray(r.images) ? r.images : [],
        featured: r.is_featured,
        sortOrder: r.sort_order,
      }));
    }
    const slugs = new Set(remote.map((p) => p.slug));
    return [...remote, ...localPortfolio.filter((p) => !slugs.has(p.slug))]
      .filter((p) => p.images.length > 0) // never show a project without real photos
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
  ["portfolio"],
  { revalidate: 300, tags: [CONTENT_TAG] },
);

export const getMaterials = () => fetchMaterials();
export const getMaterial = async (slug: string) => (await fetchMaterials()).find((m) => m.slug === slug) ?? null;
export const getProjects = () => fetchProjects();
export const getFeaturedProjects = async (limit = 6) => {
  const all = await fetchProjects();
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
};
