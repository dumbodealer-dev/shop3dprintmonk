import { integrations, uploadLimits } from "@/lib/env";
import { getMaterials } from "@/lib/content";
import { QuoteForm, type MaterialOption, type QuoteVariant } from "./QuoteForm";

/** Server wrapper: passes limits, configuration status and live materials to the client form. */
export async function QuoteFormSection({
  variant,
  initialTechnology,
  initialFinishing,
  initialNeedsDesign,
}: {
  variant: QuoteVariant;
  initialTechnology?: string;
  initialFinishing?: string[];
  initialNeedsDesign?: boolean;
}) {
  const materials = await getMaterials();
  const materialOptions: MaterialOption[] = materials
    .filter((m) => m.availability !== "unavailable")
    .map((m) => ({
      value: `${m.technology}:${m.slug}`,
      label: `${m.name} (${m.technology.toUpperCase()})`,
      slug: m.slug,
      name: m.name,
      technology: m.technology,
      ratePerGram: m.ratePerGram ?? null,
      density: m.density ?? null,
    }));
  return (
    <QuoteForm
      variant={variant}
      limits={uploadLimits()}
      configured={integrations.database}
      materials={materialOptions}
      initialTechnology={initialTechnology}
      initialFinishing={initialFinishing}
      initialNeedsDesign={initialNeedsDesign}
    />
  );
}
