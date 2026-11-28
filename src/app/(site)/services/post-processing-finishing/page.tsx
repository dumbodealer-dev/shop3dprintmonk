import Image from "next/image";
import { media } from "@/config/media";
import { serviceBySlug } from "@/content/services";
import { pageMetadata } from "@/lib/seo";
import { InfoGrid, Section, ServiceLayout } from "@/components/services/ServiceLayout";

const service = serviceBySlug("post-processing-finishing")!;
export const metadata = pageMetadata({ title: service.seoTitle, description: service.seoDescription, path: `/services/${service.slug}` });

export default function FinishingPage() {
  return (
    <ServiceLayout
      service={service}
      title="Sanding, painting and finishing for 3D prints"
      lead="Post-processing turns a raw print into a presentation-ready part — smoother surfaces, accurate colours and assembled components."
    >
      <Section eyebrow="Options" title="Finishing services">
        <InfoGrid
          items={[
            { title: "Support removal & clean-up", text: "Supports are removed and contact points cleaned up. Included as standard on most prints." },
            { title: "Sanding", text: "Progressive sanding reduces layer lines and support marks for a smoother surface." },
            { title: "Priming", text: "Filler primer hides fine lines and gives an even, paint-ready base — popular for miniatures and display models." },
            { title: "Painting", text: "Solid colours or multi-colour detail painting to match your reference or brand colours." },
            { title: "Coating", text: "Clear or protective coats for a matte, satin or gloss look and improved handling." },
            { title: "Assembly", text: "Multi-part prints joined, aligned and finished as one piece, or assembled with hardware where applicable." },
          ]}
        />
        <p className="mt-6 text-sm text-muted">
          Availability and pricing of each finishing option depend on the part&apos;s size, geometry, material and quantity. Describe the finish you
          need — or share a reference photo — and we&apos;ll confirm it with your quotation.
        </p>
      </Section>

      {media.finishingBeforeAfter.length > 0 && (
        <Section tone="white" eyebrow="Before & after" title="Raw print vs finished part">
          <ul className="grid gap-8 md:grid-cols-2">
            {media.finishingBeforeAfter.map((pair) => (
              <li key={pair.caption} className="card overflow-hidden">
                <div className="grid grid-cols-2">
                  {[pair.before, pair.after].map((ph, i) => (
                    <figure key={ph.src} className="relative aspect-square">
                      <Image src={ph.src} alt={ph.alt} fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover" />
                      <figcaption className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 font-mono text-xs text-white">{i === 0 ? "Before" : "After"}</figcaption>
                    </figure>
                  ))}
                </div>
                <p className="p-4 text-sm text-muted">{pair.caption}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section tone={media.finishingBeforeAfter.length > 0 ? "paper" : "white"} eyebrow="Choosing a finish" title="Which finish do you need?">
        <InfoGrid
          cols={3}
          items={[
            { title: "Functional parts", text: "Usually support removal only — focus is on fit and strength rather than looks." },
            { title: "Presentation models", text: "Sanding, priming and painting for client meetings, exhibitions and photography." },
            { title: "Miniatures & art", text: "Primed and paint-ready, or fully painted to your reference." },
          ]}
        />
      </Section>
    </ServiceLayout>
  );
}
