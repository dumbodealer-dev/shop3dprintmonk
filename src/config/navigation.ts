import { services } from "@/content/services";

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services", children: services.map((s) => ({ href: `/services/${s.slug}`, label: s.name, summary: s.summary })) },
  { href: "/materials", label: "Materials" },
  { href: "/industries", label: "Industries" },
  { href: "/our-work", label: "Our Work" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;
