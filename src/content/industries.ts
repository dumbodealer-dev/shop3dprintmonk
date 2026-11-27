export interface Industry {
  slug: string;
  name: string;
  icon: "cpu" | "rocket" | "car" | "building" | "graduation" | "palette" | "gem" | "briefcase";
  summary: string;
  examples: string[];
  recommended: string;
}

export const industries: Industry[] = [
  {
    slug: "engineering-product-development",
    name: "Engineering & product development",
    icon: "cpu",
    summary: "Iterate quickly on enclosures, mechanisms and fit checks before committing to tooling.",
    examples: ["Functional prototypes", "Fit and assembly checks", "Jigs and fixtures", "Pre-production samples"],
    recommended: "FDM for working parts; SLA where small details and tolerances matter.",
  },
  {
    slug: "startups-inventors",
    name: "Startups & inventors",
    icon: "rocket",
    summary: "Turn an idea into something you can hold, test and show investors or customers.",
    examples: ["Proof-of-concept models", "Pitch and demo units", "Small pilot batches", "Design help from sketches"],
    recommended: "Start with an economical FDM prototype, then a finished SLA or painted model for demos.",
  },
  {
    slug: "automotive-mechanical",
    name: "Automotive & mechanical components",
    icon: "car",
    summary: "Brackets, clips, covers and replacement parts for vehicles, machines and workshops.",
    examples: ["Replacement clips and covers", "Mounting brackets", "Ducting and guards", "Workshop tooling"],
    recommended: "ABS, ASA, nylon or carbon-fibre-filled filaments depending on heat and load.",
  },
  {
    slug: "architecture-interior-design",
    name: "Architecture & interior design",
    icon: "building",
    summary: "Scale models, facade studies and decor pieces that communicate a design clearly.",
    examples: ["Scale building models", "Site and massing models", "Decor and lighting prototypes", "Custom fixtures"],
    recommended: "FDM for larger massing models; SLA for fine facade and detail elements.",
  },
  {
    slug: "education-research",
    name: "Education & research",
    icon: "graduation",
    summary: "Project parts, lab apparatus and teaching models for students, labs and institutions.",
    examples: ["Final-year project parts", "Lab fixtures and holders", "Anatomical / teaching models", "Research prototypes"],
    recommended: "PLA and PETG keep student budgets in check; resin for detailed teaching models.",
  },
  {
    slug: "artists-designers",
    name: "Artists & designers",
    icon: "palette",
    summary: "Sculptures, product concepts and art pieces printed and finished to your vision.",
    examples: ["Sculptures and art pieces", "Product concepts", "Props and cosplay parts", "Painted finishes"],
    recommended: "SLA for fine detail; large sculptures and props in any size are welcome."
  },
  {
    slug: "miniatures-collectibles",
    name: "Miniatures & collectibles",
    icon: "gem",
    summary: "Tabletop miniatures, figurines and collectible pieces with crisp, smooth detail.",
    examples: ["Tabletop miniatures", "Figurines and busts", "Dioramas", "Primed, paint-ready prints"],
    recommended: "SLA standard resin, optionally supplied primed or painted.",
  },
  {
    slug: "corporate-promotional",
    name: "Corporate models & promotional products",
    icon: "briefcase",
    summary: "Branded models, awards, product replicas and event pieces — single units or batches.",
    examples: ["Product replicas", "Trophies and awards", "Exhibition models", "Branded giveaways"],
    recommended: "Batch production with finishing and consistent quality across every unit.",
  },
];
