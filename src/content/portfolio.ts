import type { PortfolioProject } from "./types";

/**
 * Local portfolio entries (git-based workflow).
 *
 * Add ONLY real 3D PRINTMONK projects with real photos, and only publish client
 * work with the client's approval. Two ways to add projects:
 *
 *  1. Supabase → Table Editor → portfolio_projects (recommended; no code change).
 *     Upload photos to the public "portfolio" storage bucket and paste their
 *     public URLs into the `images` JSON column. Set is_published = true.
 *
 *  2. Here: put optimised photos in /public/images/portfolio/ and add an entry:
 *
 *     {
 *       slug: "drone-arm-brackets",
 *       title: "Drone arm brackets",
 *       description: "…",
 *       categories: ["Engineering", "Functional Parts"],
 *       technology: "fdm",
 *       material: "PETG",
 *       quantity: "40 pcs",
 *       finishing: "Support removal",
 *       intendedUse: "Field-test prototypes",
 *       images: [{ src: "/images/portfolio/drone-arm-1.webp", alt: "Black PETG drone arm bracket", width: 1600, height: 1200 }],
 *       featured: true,
 *       sortOrder: 10,
 *     }
 *
 * Database projects and local projects are merged (database wins on duplicate slugs).
 */
export const localPortfolio: PortfolioProject[] = [];
