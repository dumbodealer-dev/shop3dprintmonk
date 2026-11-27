import { business } from "@/config/business";
import { pricingRules } from "@/config/pricing";
import { services } from "@/content/services";
import { posts } from "@/content/blog";
import { defaultMaterials } from "@/content/materials";
import { formatAddress } from "@/lib/format";

/**
 * /llms.txt — a concise, plain-text summary of the business for AI assistants
 * and LLM-based search (see llmstxt.org). Generated from the same data as the site.
 */
export const dynamic = "force-static";

export function GET() {
  const u = (p: string) => new URL(p, business.siteUrl).toString();
  const lines = [
    `# ${business.name}`,
    "",
    `> ${business.name} is a 3D printing service based in ${business.address.city}, India, open 24×7. It offers custom FDM and SLA resin 3D printing, rapid prototyping, bulk and batch production, custom 3D design, and sanding/painting/finishing — from a single prototype to bulk orders — with delivery across India and internationally.`,
    "",
    "## Key facts",
    `- Location: ${formatAddress() ?? business.address.city + ", India"}`,
    `- Hours: ${business.open24x7 ? "Open 24 hours, 7 days a week" : business.hours.map((h) => `${h.days} ${h.hours}`).join("; ")}`,
    business.contact.phone ? `- Phone / WhatsApp: ${business.contact.phone}` : "",
    business.contact.email ? `- Email: ${business.contact.email}` : "",
    business.social.instagram ? `- Instagram: ${business.social.instagram}` : "",
    "- Service area: Delhi NCR (Delhi, Gurugram, Noida, Faridabad, Ghaziabad), all of India, and international shipping",
    "- Accepted files: STL, OBJ, 3MF, STEP/STP; reference images and PDFs for design work",
    `- Pricing: instant online estimate for simple parts based on material weight; minimum printing charge ₹${pricingRules.minimumCharge} per order (excl. GST & shipping); complex, painted or bulk orders get a manual quotation`,
    `- Get a quote: ${u("/get-a-quote")}`,
    "",
    "## Services",
    ...services.map((s) => `- [${s.name}](${u(`/services/${s.slug}`)}): ${s.summary}`),
    "",
    "## Materials",
    ...defaultMaterials.map((m) => `- [${m.name}](${u(`/materials/${m.slug}`)}) (${m.technology.toUpperCase()}): ${m.summary}`),
    "",
    "## Guides",
    ...posts.map((p) => `- [${p.title}](${u(`/blog/${p.slug}`)}): ${p.quickAnswer}`),
    "",
    "## Other pages",
    `- [About](${u("/about")}) · [FAQ](${u("/faq")}) · [Contact](${u("/contact")}) · [Our work](${u("/our-work")}) · [Industries](${u("/industries")})`,
    "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
