import type { MetadataRoute } from "next";
import { business } from "@/config/business";
import { services } from "@/content/services";
import { posts } from "@/content/blog";
import { getMaterials } from "@/lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = business.siteUrl;
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  const materials = await getMaterials();
  return [
    page("", 1, "weekly"),
    page("/get-a-quote", 0.9),
    page("/services", 0.9),
    ...services.map((s) => page(`/services/${s.slug}`, 0.9)),
    page("/materials", 0.8),
    ...materials.map((m) => page(`/materials/${m.slug}`, 0.7)),
    page("/industries", 0.7),
    page("/our-work", 0.7, "weekly"),
    page("/about", 0.6),
    page("/contact", 0.7),
    page("/faq", 0.6),
    page("/blog", 0.6, "weekly"),
    ...posts.map((p) => ({ ...page(`/blog/${p.slug}`, 0.7), lastModified: new Date(p.updatedAt ?? p.publishedAt) })),
    page("/llms.txt", 0.3),
    page("/privacy-policy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
