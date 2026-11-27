import { business } from "@/config/business";
import { serviceBySlug } from "@/content/services";
import { getMaterials } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { CheckList, InfoGrid, Limitations, MaterialMiniGrid, Section, ServiceLayout, SpecPanel } from "@/components/services/ServiceLayout";

const service = serviceBySlug("fdm-3d-printing")!;
export const revalidate = 300;
export const metadata = pageMetadata({ title: service.seoTitle, description: service.seoDescription, path: `/services/${service.slug}` });

export default async function FdmPage() {
  const materials = (await getMaterials()).filter((m) => m.technology === "fdm");
  return (
    <ServiceLayout
      service={service}
      title="FDM 3D printing for functional parts and prototypes"
      lead="Strong, economical parts printed from engineering filaments — from a single prototype to batches of production parts, printed in Delhi and delivered across India."
    >
      <Section eyebrow="How it works" title="How FDM printing works" lead="Fused Deposition Modelling melts a plastic filament and lays it down line by line, building your part one thin layer at a time.">
        <InfoGrid
          items={[
            { title: "Your file is sliced", text: "We orient the model and convert it into layers and tool paths, choosing wall thickness, infill and supports for how the part will be used." },
            { title: "Plastic is deposited", text: "A heated nozzle traces each layer with melted filament. Layers fuse together as the part grows upward." },
            { title: "Cleaned and checked", text: "Supports are removed and the part is checked before any finishing, packing and dispatch." },
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Applications" title="What FDM is great for">
        <CheckList
          cols={3}
          items={[
            "Functional prototypes and fit checks",
            "Brackets, mounts, clips and enclosures",
            "Jigs, fixtures and workshop tooling",
            "Replacement and spare parts",
            "Larger components and architectural models",
            "Economical small-batch production",
          ]}
        />
      </Section>

      <Section eyebrow="Materials" title="Available filament types" lead="Each filament behaves differently in strength, heat resistance and finish. Availability and colours are confirmed with your quote.">
        <MaterialMiniGrid materials={materials} />
      </Section>

      <Section tone="white" eyebrow="Specifications" title="Size, layers and surface finish">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="prose-body">
            <p>
              <strong>Layer height</strong> controls the balance between speed and surface quality. Thinner layers give smoother curves and finer
              detail but take longer to print; thicker layers are faster and more economical for large or hidden parts.
            </p>
            <p>
              <strong>Surface finish:</strong> FDM parts show fine horizontal layer lines. If appearance matters, we can sand, prime and paint the
              part — or recommend SLA for small, highly detailed pieces.
            </p>
            <p>
              <strong>Any size:</strong> from tiny clips to large components — there&apos;s no size limit. Share the overall dimensions and we&apos;ll
              plan the best way to produce your part.
            </p>
          </div>
          <SpecPanel
            rows={[
              { label: "Layer heights", value: business.capabilities.fdmLayerHeights },
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="Strength" title="Strength and durability considerations">
        <InfoGrid
          items={[
            { title: "Orientation matters", text: "FDM parts are strongest along their layers and weakest between them. We orient parts so the main loads run along the layers wherever possible." },
            { title: "Walls and infill", text: "More perimeter walls and higher infill make parts stronger and heavier. We tune them to your application rather than using one setting for everything." },
            { title: "Material choice", text: "Heat, sunlight, impact and flexing each point to different filaments — tell us where and how the part will be used." },
          ]}
        />
      </Section>

      <Section tone="white" eyebrow="Design tips" title="Common design limitations">
        <Limitations
          items={[
            "Steep overhangs and bridges need supports, which can leave marks where they are removed.",
            "Very thin walls, pins and small text may not print cleanly — mention delicate features in your request.",
            "Holes and mating parts need a little clearance; tell us which features must fit hardware or other parts.",
            "Visible layer lines are normal; choose finishing or SLA when a smooth surface is essential.",
          ]}
        />
      </Section>

      <Section eyebrow="Post-processing" title="Finishing options for FDM parts">
        <CheckList cols={3} items={["Support removal and clean-up", "Sanding", "Priming", "Painting", "Coating", "Assembly, where applicable"]} />
        <p className="mt-4 text-sm text-muted">Availability and pricing depend on the project and are confirmed with your quotation.</p>
      </Section>
    </ServiceLayout>
  );
}
