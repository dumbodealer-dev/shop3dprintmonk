import { business } from "@/config/business";
import { serviceBySlug } from "@/content/services";
import { getMaterials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { CheckList, InfoGrid, Limitations, MaterialMiniGrid, Section, ServiceLayout, SpecPanel } from "@/components/services/ServiceLayout";

const service = serviceBySlug("sla-resin-3d-printing")!;
export const revalidate = 300;
export const metadata = pageMetadata({ title: service.seoTitle, description: service.seoDescription, path: `/services/${service.slug}` });

export default async function SlaPage() {
  const materials = (await getMaterials()).filter((m) => m.technology === "sla");
  return (
    <ServiceLayout
      service={service}
      title="SLA resin 3D printing for fine detail and smooth surfaces"
      lead="Resin printing captures crisp edges, small text and delicate features with a smooth surface — ideal for miniatures, product models, jewellery patterns and small precise parts."
    >
      <Section eyebrow="How it works" title="How resin printing works" lead="SLA and related resin processes harden liquid photopolymer with light, one very thin layer at a time.">
        <InfoGrid
          items={[
            { title: "Prepared and supported", text: "We orient your model and add fine supports so delicate features print reliably with minimal marks on visible surfaces." },
            { title: "Cured layer by layer", text: "Light solidifies each cross-section in a vat of resin, producing very fine layers and sharp detail." },
            { title: "Washed and post-cured", text: "Parts are washed to remove uncured resin, then post-cured with UV light to reach their final properties." },
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Detail & finish" title="Why choose resin">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="prose-body">
            <p>
              Resin prints have <strong>a much smoother surface</strong> than filament prints, with layer lines that are often barely visible.
              Small features — textures, engraved text, faces on miniatures, thin fins — come out crisp.
            </p>
            <p>
              That makes resin ideal for parts that will be <strong>photographed, displayed, painted or used as masters</strong> for moulding and
              casting.
            </p>
          </div>
          <SpecPanel
            rows={[
              { label: "Layer heights", value: business.capabilities.slaLayerHeights },
            ]}
            note="Layer height and achievable tolerances depend on the resin and part geometry. We review your model and confirm dimensions and tolerances with the quotation. Large models are welcome."
          />
        </div>
      </Section>

      <Section eyebrow="Applications" title="What resin printing is used for">
        <CheckList
          cols={3}
          items={[
            "Miniatures, figurines and collectibles",
            "Product and display models",
            "Jewellery and casting patterns",
            "Dental and small precision models",
            "Master patterns for silicone moulds",
            "Small precise functional prototypes",
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Materials" title="Standard and specialty resins" lead="Resins range from standard (best detail) to tough, flexible, clear and castable grades. Availability is confirmed with your quote.">
        <MaterialMiniGrid materials={materials} />
      </Section>

      <Section eyebrow="Limitations" title="Things to know about resin parts">
        <Limitations
          items={[
            "Standard resins are more brittle than filaments and can chip under impact.",
            "Many resins are not suited to prolonged sunlight, heat or outdoor use.",
            "Large solid resin models use a lot of material — we hollow them where possible to keep costs down, or suggest FDM if it suits the part better.",
            "Support contact points leave small marks that are sanded during finishing.",
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Post-curing & finishing" title="From raw print to finished part">
        <CheckList cols={3} items={["Washing and UV post-curing", "Support removal", "Sanding", "Priming (paint-ready)", "Painting", "Clear coating"]} />
        <p className="mt-4 text-sm text-muted">Finishing availability and pricing depend on the project and are confirmed with your quotation.</p>
      </Section>
    </ServiceLayout>
  );
}
