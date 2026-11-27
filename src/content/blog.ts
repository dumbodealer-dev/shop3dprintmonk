/**
 * Knowledge hub articles. Add a post by appending to `posts` — the blog index,
 * article page, sitemap, llms.txt and structured data update automatically.
 *
 * Writing for Google AND AI assistants:
 *  - `quickAnswer`: a 2–3 sentence direct answer to the title question.
 *  - `takeaways`: short, factual bullet points.
 *  - `faqs`: real questions people ask (rendered + FAQPage schema).
 *  - Use clear H2s, lists and tables; state assumptions; link to services.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "tip"; text: string };

export interface Post {
  slug: string;
  title: string;
  description: string;
  category: "Pricing" | "Materials" | "Design" | "Guides" | "Business";
  publishedAt: string; // YYYY-MM-DD
  updatedAt?: string;
  readingMinutes: number;
  tags: string[];
  quickAnswer: string;
  takeaways: string[];
  body: Block[];
  faqs: { q: string; a: string }[];
  /** Internal links shown at the end of the article. */
  related?: { href: string; label: string }[];
}

export const posts: Post[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "3d-printing-cost-in-india",
    title: "How much does 3D printing cost in India? (2026 price guide)",
    description:
      "3D printing prices in India explained: per-gram rates for PLA, PETG, ABS, nylon and resin, minimum charges, finishing, quantity discounts and worked examples in rupees.",
    category: "Pricing",
    publishedAt: "2026-11-27",
    readingMinutes: 7,
    tags: ["Pricing", "India", "FDM", "SLA"],
    quickAnswer:
      "Most 3D printing services in India price by the weight of material used. In 2026, typical rates are about ₹5–15 per gram for PLA, ₹10–20 for PETG and ABS, ₹20–40 for flexible and engineering filaments, and ₹15–50 for resin, usually with a minimum order charge. At 3D PRINTMONK the minimum printing charge is ₹300 per order; above that you pay for the material and process your part actually needs.",
    takeaways: [
      "Price depends mainly on part volume (grams of material), material type and quantity.",
      "Small parts often cost the minimum charge — combine several small parts in one order.",
      "Resin (SLA) costs more per part than PLA (FDM) but gives much finer detail.",
      "Sanding, priming and painting add to the price; painting is usually quoted after review.",
      "Quotes normally exclude GST (18%) and shipping.",
    ],
    body: [
      { type: "h2", text: "What decides the price of a 3D print?" },
      {
        type: "ul",
        items: [
          "Material used (grams): a solid, chunky part uses far more material than a thin shell. FDM parts are usually printed with a hollow infill pattern, which keeps weight and cost down.",
          "Material type: PLA is the cheapest; PETG, ABS and ASA cost a little more; TPU, nylon, carbon-fibre and specialty resins are premium.",
          "Process: SLA resin printing captures fine detail but uses more expensive material per gram.",
          "Quantity: printing several copies usually brings the price per part down.",
          "Finishing: support removal is standard; sanding, priming, coating and painting take extra hands-on time.",
          "Size: bigger parts use more material and machine time — any size is possible.",
        ],
      },
      { type: "h2", text: "Typical per-gram rates in India (2026)" },
      {
        type: "table",
        head: ["Material", "Process", "Typical market range", "3D PRINTMONK estimate rate"],
        rows: [
          ["PLA", "FDM", "₹5–15 / g", "₹8 / g"],
          ["PETG", "FDM", "₹10–20 / g", "₹10 / g"],
          ["ABS / ASA", "FDM", "₹10–25 / g", "₹12–14 / g"],
          ["TPU (flexible)", "FDM", "₹15–40 / g", "₹18 / g"],
          ["Nylon / carbon-fibre", "FDM", "₹25–70 / g", "₹30–35 / g"],
          ["Standard resin", "SLA", "₹15–50 / g", "₹18 / g"],
          ["Tough / clear / flexible resin", "SLA", "₹20–60 / g", "₹22–30 / g"],
          ["Castable resin", "SLA", "₹35–80 / g", "₹45 / g"],
        ],
      },
      {
        type: "p",
        text: "Market ranges vary widely between providers and cities. The right-hand column shows the rates our instant estimate uses; the final price is confirmed after we review your file.",
      },
      { type: "h2", text: "Worked examples" },
      {
        type: "table",
        head: ["Part", "Material", "Approx. weight", "Estimated price"],
        rows: [
          ["Keychain, 40 × 30 × 5 mm", "PLA (FDM)", "≈ 4 g", "₹300 (minimum charge)"],
          ["Solid-looking cube, 50 mm", "PLA (FDM, 20% infill)", "≈ 47 g", "≈ ₹380"],
          ["Same cube", "Standard resin (SLA, hollowed)", "≈ 47 g", "≈ ₹850"],
          ["10 × the PLA cube", "PLA (FDM)", "≈ 470 g", "≈ ₹3,400 (10% quantity discount)"],
        ],
      },
      {
        type: "tip",
        text: "Have several small parts? Put them in one order. The ₹300 minimum covers the whole order, not each part — so ten tiny parts can cost the same as one.",
      },
      { type: "h2", text: "How to get an accurate price quickly" },
      {
        type: "ol",
        items: [
          "Export your model as STL, 3MF or OBJ (or STEP for engineering parts).",
          "Upload it on our Get a Quote page — you'll see it in 3D with an instant estimate.",
          "Choose FDM or SLA, the material, quantity and finishing to see how the price changes.",
          "Submit the request; our team checks the file and confirms the final price before printing.",
        ],
      },
      { type: "h2", text: "When you'll get a manual quote instead" },
      {
        type: "p",
        text: "Bulk orders (more than 20 pieces of a part), painting or assembly, STEP files, design work and high-value orders are priced by our team after reviewing the details. This avoids surprises for complex jobs.",
      },
    ],
    faqs: [
      { q: "What is the minimum charge for 3D printing at 3D PRINTMONK?", a: "The minimum printing charge is ₹300 per order (excluding GST and shipping). If the material-based cost of your parts is lower, you pay ₹300; if it is higher, you pay the actual cost." },
      { q: "Is resin printing more expensive than PLA?", a: "Usually yes. Resin costs more per gram and needs washing and curing, but it gives much finer detail and smoother surfaces. For functional or large parts, FDM in PLA or PETG is normally more economical." },
      { q: "Do 3D printing prices include GST?", a: "Most quotes in India, including our online estimate, exclude GST (18%) and shipping. These are added to the final invoice." },
      { q: "How can I reduce the cost of a 3D print?", a: "Use FDM instead of resin where fine detail isn't needed, choose PLA or PETG, reduce unnecessary solid volume in your design, order parts together, and skip cosmetic finishing for functional parts." },
    ],
    related: [
      { href: "/get-a-quote", label: "Get an instant estimate" },
      { href: "/materials", label: "Compare materials" },
      { href: "/services/bulk-batch-production", label: "Bulk production pricing" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "pla-vs-petg-vs-abs-vs-tpu-which-filament",
    title: "PLA vs PETG vs ABS vs TPU vs Nylon: which 3D printing filament should you choose?",
    description:
      "A practical comparison of the most common FDM filaments — strength, heat resistance, flexibility, finish and cost — with clear recommendations for typical parts.",
    category: "Materials",
    publishedAt: "2026-11-27",
    readingMinutes: 6,
    tags: ["Materials", "FDM", "Filament"],
    quickAnswer:
      "Choose PLA for low-cost models and prototypes, PETG for tougher functional parts and mild heat, ABS or ASA for heat-tolerant and outdoor parts (ASA handles sunlight better), TPU for flexible rubber-like parts, and nylon or carbon-fibre-filled filaments for strong, wear-resistant engineering parts.",
    takeaways: [
      "PLA: cheapest and easiest, but softens in heat (e.g. inside a parked car).",
      "PETG: the best all-round choice for functional parts.",
      "ABS / ASA: better heat resistance; ASA is preferred outdoors.",
      "TPU: flexible, impact-absorbing parts like gaskets, cases and grips.",
      "Nylon / CF: strong, stiff and wear-resistant — premium cost.",
    ],
    body: [
      { type: "h2", text: "Quick comparison" },
      {
        type: "table",
        head: ["Filament", "Strength", "Heat resistance", "Flexibility", "Relative cost", "Best for"],
        rows: [
          ["PLA", "Good stiffness, brittle on impact", "Low", "Rigid", "₹", "Models, prototypes, display parts"],
          ["PETG", "Tough", "Moderate", "Slight flex", "₹", "Functional parts, enclosures, brackets"],
          ["ABS", "Tough", "Good", "Rigid with give", "₹₹", "Automotive interior, mechanical parts"],
          ["ASA", "Tough", "Good + UV resistant", "Rigid with give", "₹₹", "Outdoor parts, exterior trim"],
          ["TPU", "Very tough, elastic", "Moderate", "Flexible", "₹₹", "Gaskets, cases, bumpers, grips"],
          ["Nylon", "High, wear resistant", "Good", "Semi-flexible", "₹₹₹", "Gears, hinges, clips, tooling"],
          ["Carbon-fibre filled", "Very stiff", "Depends on base", "Very rigid", "₹₹₹", "Brackets, drone parts, fixtures"],
        ],
      },
      { type: "h2", text: "How to choose in three questions" },
      {
        type: "ol",
        items: [
          "Will it get hot (sunlight, car interior, near a motor)? Avoid PLA; choose PETG, ABS or ASA.",
          "Does it need to bend, seal or absorb impact? Choose TPU.",
          "Will it carry load or rub against other parts? Choose PETG for moderate loads, nylon or carbon-fibre-filled for demanding ones.",
        ],
      },
      { type: "p", text: "If none of these apply — for example a concept model, architectural model or display piece — PLA gives the best value and the widest colour range." },
      { type: "h2", text: "Common mistakes" },
      {
        type: "ul",
        items: [
          "Using PLA for parts left in a car or in direct summer sun in India — they can warp.",
          "Expecting carbon-fibre-filled filament to behave like a carbon-fibre composite sheet; it's stiffer, not dramatically stronger.",
          "Choosing a premium material when PETG would do — it costs more without a real benefit.",
        ],
      },
      { type: "tip", text: "Not sure? Choose “Not sure — please advise” in the quote form and tell us how the part will be used. We'll recommend a material." },
    ],
    faqs: [
      { q: "Which filament is strongest for 3D printing?", a: "For everyday functional parts PETG offers the best balance. For high strength and wear resistance, nylon and carbon-fibre-filled filaments are stronger, at a higher cost." },
      { q: "Is PLA good for outdoor use?", a: "Not really. PLA softens at relatively low temperatures and degrades outdoors. ASA is the usual choice for outdoor parts in Indian weather." },
      { q: "Which filament is flexible?", a: "TPU is the common flexible filament. Its softness depends on the grade; it's used for gaskets, phone cases, bumpers and grips." },
    ],
    related: [
      { href: "/materials", label: "Full materials library" },
      { href: "/services/fdm-3d-printing", label: "FDM 3D printing service" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "choosing-the-right-resin-for-sla-printing",
    title: "Choosing the right resin for SLA 3D printing",
    description:
      "Standard, tough, flexible, clear and castable resins compared: detail, strength, finish and best uses — and when resin is the wrong choice.",
    category: "Materials",
    publishedAt: "2026-11-27",
    readingMinutes: 5,
    tags: ["Materials", "SLA", "Resin"],
    quickAnswer:
      "Use standard resin for the best detail on miniatures, figurines and display models; tough or ABS-like resin for functional prototypes and snap-fits; flexible resin for soft-touch parts; clear resin for transparent covers and light guides; and castable resin for jewellery and investment-casting patterns.",
    takeaways: [
      "Standard resin gives the finest detail but is brittle on impact.",
      "Tough resin trades a little detail for much better durability.",
      "Clear resin needs sanding and coating for true transparency.",
      "Castable resin is for making metal parts by investment casting.",
      "For large, load-bearing or outdoor parts, FDM is usually better than resin.",
    ],
    body: [
      { type: "h2", text: "Resin types at a glance" },
      {
        type: "table",
        head: ["Resin", "Detail", "Durability", "Best for"],
        rows: [
          ["Standard", "Excellent", "Brittle under impact", "Miniatures, figurines, display models, parts to paint"],
          ["Tough / ABS-like", "Very good", "Good impact resistance", "Functional prototypes, enclosures, snap-fits"],
          ["Flexible", "Good", "Bendable, soft-touch", "Seals, grips, wearable prototypes"],
          ["Clear", "Very good", "Rigid", "Light guides, covers, fluid visualisation"],
          ["Castable", "Excellent", "Not for end use", "Jewellery and investment-casting patterns"],
        ],
      },
      { type: "h2", text: "Why resin looks so good" },
      { type: "p", text: "SLA printers cure very thin layers of liquid resin with light, so surfaces come out smooth and fine features — faces, textures, small text — stay crisp. That's why resin is the default for miniatures and presentation models." },
      { type: "h2", text: "When not to use resin" },
      {
        type: "ul",
        items: [
          "Large solid parts: resin gets expensive for big, chunky parts — FDM is usually more economical.",
          "Parts under load or impact: tough FDM materials are more forgiving.",
          "Long outdoor exposure: many resins degrade with UV and heat.",
        ],
      },
      { type: "tip", text: "Painting a miniature? Ask for a primed, paint-ready finish — supports are removed and surfaces sanded so paint goes on cleanly." },
    ],
    faqs: [
      { q: "Is resin 3D printing strong?", a: "Standard resin is rigid but brittle. Tough or ABS-like resins are much more impact resistant and suit functional prototypes; for heavy loads FDM nylon or PETG is usually better." },
      { q: "Can resin prints be transparent?", a: "Clear resin prints are translucent straight off the printer. Sanding and clear coating make them close to transparent." },
      { q: "What is castable resin used for?", a: "Castable resin burns out cleanly, so jewellers and foundries use printed patterns to cast metal parts through investment casting." },
    ],
    related: [
      { href: "/services/sla-resin-3d-printing", label: "SLA resin printing service" },
      { href: "/services/post-processing-finishing", label: "Finishing & painting" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "3d-printing-design-guidelines",
    title: "3D printing design guidelines: walls, overhangs, holes and tolerances",
    description:
      "Practical design rules for FDM and SLA 3D printing — minimum wall thickness, overhang angles, hole clearance, text, hollowing and orientation — to get strong, accurate parts.",
    category: "Design",
    publishedAt: "2026-11-27",
    readingMinutes: 7,
    tags: ["Design", "FDM", "SLA", "Guides"],
    quickAnswer:
      "As general rules of thumb: keep FDM walls at least 0.8–1.2 mm and SLA walls at least 0.6–1 mm, keep overhangs within about 45° of vertical or add supports, leave roughly 0.2–0.5 mm clearance for parts that fit together on FDM (less on SLA), make embossed or engraved text at least 0.5–1 mm deep, and add drain holes when hollowing resin parts.",
    takeaways: [
      "Thin walls and tiny pins are the most common cause of failed prints.",
      "Overhangs steeper than about 45° need supports, which can mark the surface.",
      "Mating parts need clearance — tell us which surfaces must fit.",
      "Orientation changes strength: FDM parts are weakest between layers.",
      "These are general guidelines; we check your specific part before printing.",
    ],
    body: [
      { type: "h2", text: "Rules of thumb by process" },
      {
        type: "table",
        head: ["Feature", "FDM (filament)", "SLA (resin)"],
        rows: [
          ["Minimum wall thickness", "≈ 0.8–1.2 mm", "≈ 0.6–1.0 mm (supported)"],
          ["Unsupported overhang", "≈ 45° from vertical", "≈ 30–45° (supports common)"],
          ["Clearance for fitting parts", "≈ 0.2–0.5 mm", "≈ 0.1–0.3 mm"],
          ["Minimum feature / pin", "≈ 1–2 mm", "≈ 0.5–1 mm"],
          ["Embossed / engraved text", "≥ 0.6–1 mm deep, bold font", "≥ 0.4–0.5 mm deep"],
          ["Hollow parts", "Infill handled automatically", "Add drain holes (≈ 2–3 mm+)"],
        ],
      },
      { type: "p", text: "Exact limits depend on the printer, material and part geometry — treat these as starting points, not guarantees." },
      { type: "h2", text: "Design for strength" },
      {
        type: "ul",
        items: [
          "FDM parts are strongest along their layers. Tell us the load direction so we can orient the part correctly.",
          "Add fillets to sharp inside corners to reduce stress concentration.",
          "Thicker walls (more perimeters) add more strength than higher infill alone.",
          "For screws, design holes for heat-set inserts or allow for self-tapping clearance.",
        ],
      },
      { type: "h2", text: "Design for accuracy" },
      {
        type: "ul",
        items: [
          "Mark critical dimensions in your request — we'll check them before printing.",
          "Very large flat surfaces can warp on FDM; ribs or a slight curvature help.",
          "Holes printed vertically are rounder than holes printed horizontally.",
        ],
      },
      { type: "h2", text: "Design for good looks" },
      {
        type: "ul",
        items: [
          "Put the most visible surface facing up or sideways — support marks end up underneath.",
          "Choose SLA for fine textures, faces and small text.",
          "Ask for sanding and priming if the part will be photographed or painted.",
        ],
      },
      { type: "tip", text: "No CAD experience? Share a sketch, photo or broken part and use our custom 3D design service." },
    ],
    faqs: [
      { q: "What is the minimum wall thickness for 3D printing?", a: "As a rule of thumb, about 0.8–1.2 mm for FDM and 0.6–1 mm for SLA. Thinner walls may print but can be fragile; we review delicate features before printing." },
      { q: "How much clearance do 3D printed parts need to fit together?", a: "Typically around 0.2–0.5 mm on FDM and 0.1–0.3 mm on SLA, depending on the fit you need. Tell us which surfaces mate so we can check them." },
      { q: "Why do 3D prints need supports?", a: "Layers can't be printed in mid-air. Overhangs steeper than about 45° and bridges over gaps need temporary supports, which are removed after printing." },
    ],
    related: [
      { href: "/services/custom-3d-design", label: "Custom 3D design" },
      { href: "/blog/how-to-prepare-stl-files-for-3d-printing", label: "Prepare your STL file" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "stl-vs-step-vs-3mf-vs-obj-file-formats",
    title: "STL vs STEP vs 3MF vs OBJ: which file format should you send for 3D printing?",
    description:
      "What each 3D file format stores, which one to export from your CAD or sculpting software, and why STEP is best for engineering parts while STL and 3MF are best for printing.",
    category: "Guides",
    publishedAt: "2026-11-27",
    readingMinutes: 5,
    tags: ["Files", "Guides", "Design"],
    quickAnswer:
      "Send STL or 3MF for straightforward printing — they're universally supported and give an instant online estimate on our quote page. Send STEP for engineering parts or anything we may need to modify, because it keeps exact CAD geometry. OBJ is fine for models from sculpting and 3D-scanning software.",
    takeaways: [
      "STL: universal triangle mesh, no units — tell us the size in mm.",
      "3MF: modern mesh format that keeps units, colours and multiple parts.",
      "STEP / STP: exact CAD geometry — best for engineering and design changes.",
      "OBJ: common from sculpting and scanning tools.",
      "Large files are welcome — upload them directly or share a cloud link.",
    ],
    body: [
      { type: "h2", text: "Format comparison" },
      {
        type: "table",
        head: ["Format", "What it stores", "Units", "Best for"],
        rows: [
          ["STL", "Triangle mesh surface", "Not stored (assumed mm)", "Any print; universal"],
          ["3MF", "Mesh + units, colours, multiple parts", "Stored", "Multi-part prints, modern slicers"],
          ["STEP / STP", "Exact CAD solids (B-rep)", "Stored", "Engineering parts, modifications"],
          ["OBJ", "Mesh (+ optional textures)", "Not stored", "Sculpts, scans, art models"],
        ],
      },
      { type: "h2", text: "How to export from popular software" },
      {
        type: "ul",
        items: [
          "Fusion 360: right-click the body → Save as Mesh (STL/3MF), or File → Export → STEP.",
          "SolidWorks: File → Save As → STL or STEP AP214.",
          "Tinkercad: Export → .STL or .OBJ.",
          "Blender: File → Export → STL or OBJ (apply scale first).",
          "SketchUp: use an STL export extension and make sure the model is a solid group.",
        ],
      },
      { type: "h2", text: "Tips for a smooth quote" },
      {
        type: "ol",
        items: [
          "Export in millimetres and mention the overall size.",
          "Upload each part as its own file if they're printed separately.",
          "For engineering parts, send STEP plus an STL — STEP for accuracy, STL for the instant estimate.",
        ],
      },
    ],
    faqs: [
      { q: "Which file format is best for 3D printing?", a: "STL and 3MF are the standard printing formats. 3MF is more modern because it stores units and multiple parts. For engineering parts, STEP is best because it keeps exact geometry." },
      { q: "Can you print from a STEP file?", a: "Yes. We open STEP files in CAD, check them and quote manually. STEP files can't be previewed in the browser, so add an STL too if you want an instant estimate." },
      { q: "Is there a file size limit?", a: "3D files are often heavy, so large uploads are welcome. If a file is too big to upload, share a Google Drive or WeTransfer link in the project notes." },
    ],
    related: [
      { href: "/get-a-quote", label: "Upload your file" },
      { href: "/blog/how-to-prepare-stl-files-for-3d-printing", label: "Prepare your STL file" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "bulk-3d-printing-for-businesses",
    title: "Bulk 3D printing for businesses: when it beats injection moulding",
    description:
      "How small-batch and bulk 3D printing works for businesses in India — cost per part, when it's cheaper than injection moulding, lead times, quality checks and repeat orders.",
    category: "Business",
    publishedAt: "2026-11-27",
    readingMinutes: 6,
    tags: ["Business", "Bulk", "Manufacturing"],
    quickAnswer:
      "Bulk 3D printing is usually the better choice for runs from a handful up to several hundred parts, for parts that change often, and for complex shapes, because there is no mould cost. Injection moulding becomes cheaper once volumes are high enough to pay back the mould — often in the thousands of parts, depending on part size and complexity.",
    takeaways: [
      "No tooling cost — you can change the design between batches.",
      "Ideal for pilot runs, spare parts, jigs, fixtures and customised products.",
      "Cost per part stays roughly flat; moulding gets cheaper with volume.",
      "Approve a sample first, then reorder against the same specification.",
      "Share quantity tiers (e.g. 50 / 200 / 500) to compare prices.",
    ],
    body: [
      { type: "h2", text: "3D printing vs injection moulding" },
      {
        type: "table",
        head: ["", "Bulk 3D printing", "Injection moulding"],
        rows: [
          ["Upfront tooling", "None", "Mould required (significant cost)"],
          ["Design changes", "Free — edit the file", "Expensive mould changes"],
          ["Cost per part", "Roughly constant", "Very low at high volume"],
          ["Lead time to first part", "Days", "Weeks (mould making)"],
          ["Sweet spot", "1 – several hundred parts", "Thousands and above"],
        ],
      },
      { type: "h2", text: "Good fits for bulk 3D printing" },
      {
        type: "ul",
        items: [
          "Pilot and pre-production runs before investing in tooling",
          "Spare and replacement parts that are no longer available",
          "Jigs, fixtures and assembly aids for factories",
          "Customised or personalised products and corporate gifts",
          "Enclosures and brackets for electronics in small volumes",
        ],
      },
      { type: "h2", text: "How a bulk order works at 3D PRINTMONK" },
      {
        type: "ol",
        items: [
          "Send files, quantities, material, finish and timeline through the bulk quote form.",
          "We print a sample or pilot batch for you to approve.",
          "The approved sample becomes the reference for the production batch.",
          "Parts are printed, finished and checked against the sample before dispatch.",
          "Reorder any time by quoting your reference number.",
        ],
      },
      { type: "tip", text: "Need a GST invoice or have a purchase order process? Mention it in your enquiry so the paperwork is aligned from the start." },
    ],
    faqs: [
      { q: "Is 3D printing cheaper than injection moulding?", a: "For small and medium quantities, usually yes, because there's no mould. At high volumes injection moulding is cheaper per part. The break-even point depends on part size, material and complexity." },
      { q: "How many parts can you 3D print in one order?", a: "From a single part to production batches. Orders above 20 pieces per part receive a dedicated bulk quotation with quantity-based pricing." },
      { q: "Can I reorder the same part later?", a: "Yes. Quote your previous enquiry reference and we'll match the approved material, settings and finish as closely as possible." },
    ],
    related: [
      { href: "/services/bulk-batch-production", label: "Bulk & batch production" },
      { href: "/get-a-quote?type=bulk", label: "Request a bulk quote" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "3d-printing-service-delhi-ncr",
    title: "3D printing service in Delhi NCR: how to get parts printed (and shipped anywhere)",
    description:
      "A guide to getting custom 3D printing done in Delhi, Gurugram, Noida and across NCR — what to send, FDM vs SLA, pricing, 24×7 service and delivery across India and worldwide.",
    category: "Guides",
    publishedAt: "2026-11-27",
    readingMinutes: 5,
    tags: ["Delhi", "Local", "Guides"],
    quickAnswer:
      "3D PRINTMONK is a 3D printing studio in Sultanpur, New Delhi (110030), open 24×7. You can upload STL, OBJ, 3MF or STEP files online for an instant estimate or a manual quote, choose FDM or SLA resin printing with optional finishing, and get parts delivered across Delhi NCR, the rest of India and internationally.",
    takeaways: [
      "Based in Sultanpur, New Delhi — serving Delhi, Gurugram, Noida, Faridabad and Ghaziabad.",
      "Open 24×7 for enquiries and printing.",
      "Online upload with 3D preview and instant estimate.",
      "FDM and SLA resin printing, design and finishing under one roof.",
      "Delivery across India and outside India.",
    ],
    body: [
      { type: "h2", text: "What you can get printed" },
      {
        type: "ul",
        items: [
          "Engineering prototypes, enclosures, brackets and replacement parts",
          "Miniatures, figurines and display models in high-detail resin",
          "Architectural and scale models",
          "Corporate gifts, awards and promotional pieces",
          "Small production batches for startups and businesses",
        ],
      },
      { type: "h2", text: "How ordering works" },
      {
        type: "ol",
        items: [
          "Upload your file on the Get a Quote page (or describe your idea if you don't have one).",
          "See an instant estimate for simple parts, or request a manual quote for complex jobs.",
          "Approve the material, finish and price.",
          "We print, finish, inspect and ship — or you can discuss pickup with us.",
        ],
      },
      { type: "h2", text: "Delivery" },
      { type: "p", text: "We deliver across Delhi NCR and to every part of India, and we also ship internationally. Shipping cost and timelines are confirmed with your quotation." },
      { type: "tip", text: "Prefer to talk? Message us on WhatsApp at +91 91405 21406 with your file and requirements." },
    ],
    faqs: [
      { q: "Where is 3D PRINTMONK located?", a: "3D PRINTMONK is near Tiles Godown, Sultanpur, New Delhi 110030, India." },
      { q: "Is 3D PRINTMONK open 24 hours?", a: "Yes. 3D PRINTMONK is open 24×7 — you can send enquiries any time and printing runs around the clock." },
      { q: "Do you deliver outside Delhi and outside India?", a: "Yes. We deliver across India and also ship internationally. Shipping is confirmed with your quote." },
    ],
    related: [
      { href: "/contact", label: "Contact & location" },
      { href: "/get-a-quote", label: "Get a quote" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "sla-vs-fdm-which-3d-printing-process",
    title: "SLA vs FDM: which 3D printing process is right for your part?",
    description:
      "A practical, jargon-free comparison of filament (FDM) and resin (SLA) 3D printing — strength, detail, size, finish and cost — so you can choose with confidence.",
    category: "Guides",
    publishedAt: "2026-11-26",
    updatedAt: "2026-11-27",
    readingMinutes: 6,
    tags: ["FDM", "SLA", "Guides"],
    quickAnswer:
      "Choose FDM (filament) for functional parts, larger components and lower cost. Choose SLA (resin) for fine detail, smooth surfaces, miniatures and small precise parts. If the part must be both strong and detailed, tough resins or a finished FDM part are common compromises.",
    takeaways: [
      "FDM: economical, strong materials, larger parts, visible layer lines.",
      "SLA: very fine detail and smooth surfaces, higher cost for large parts.",
      "Heat and sunlight rule out PLA and many standard resins.",
      "Both can be sanded, primed and painted.",
    ],
    body: [
      {
        type: "p",
        text: "Most custom 3D printing jobs are made with one of two processes: FDM, which melts plastic filament, or SLA, which hardens liquid resin with light. Both build parts layer by layer, but they produce very different results. Here is how to decide.",
      },
      { type: "h2", text: "How each process works" },
      {
        type: "p",
        text: "FDM (Fused Deposition Modelling) pushes a thin strand of melted plastic through a moving nozzle and draws each layer of the part. SLA (Stereolithography) and related resin processes cure a thin layer of liquid photopolymer with light, then lift and repeat.",
      },
      {
        type: "table",
        head: ["", "FDM", "SLA"],
        rows: [
          ["Detail", "Good", "Excellent"],
          ["Surface", "Visible layer lines", "Very smooth"],
          ["Strength options", "Wide (PETG, nylon, TPU…)", "Depends on resin"],
          ["Large parts", "Economical", "Costlier"],
          ["Cost", "Lower", "Higher"],
        ],
      },
      { type: "h2", text: "Choose FDM when you need" },
      {
        type: "ul",
        items: [
          "Functional parts that will be handled, screwed or loaded",
          "Larger components or many parts at a lower cost",
          "Engineering materials such as PETG, ABS, ASA, nylon or flexible TPU",
          "Quick, economical prototypes to test size and fit",
        ],
      },
      { type: "h2", text: "Choose SLA when you need" },
      {
        type: "ul",
        items: [
          "Very fine details, sharp edges and small text",
          "A smooth surface for display, photography or painting",
          "Miniatures, figurines, jewellery or dental patterns",
          "Small, precise parts where layer lines would be a problem",
        ],
      },
      { type: "h2", text: "Things people often overlook" },
      {
        type: "ul",
        items: [
          "Environment: standard resin and PLA can soften or become brittle in heat and sunlight — tell us where the part will live.",
          "Size: both processes can make large parts, but big solid resin parts cost more — FDM is often the economical choice.",
          "Finishing: both processes can be sanded, primed and painted, but resin starts much smoother.",
          "Quantity: for batches, FDM often wins on cost per part; SLA can still be efficient for many small parts printed together.",
        ],
      },
      {
        type: "tip",
        text: "Not sure? Select “Not sure” in the quote form and tell us what the part is for. We'll recommend the process and material that fit your use and budget.",
      },
    ],
    faqs: [
      { q: "Is SLA stronger than FDM?", a: "Not usually. FDM offers tougher engineering materials such as PETG and nylon. SLA wins on detail and surface finish; tough resins narrow the gap for functional prototypes." },
      { q: "Which is cheaper, FDM or SLA?", a: "FDM is generally cheaper per part, especially for larger parts. SLA costs more but gives much finer detail." },
    ],
    related: [
      { href: "/services/fdm-3d-printing", label: "FDM printing" },
      { href: "/services/sla-resin-3d-printing", label: "SLA resin printing" },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-prepare-stl-files-for-3d-printing",
    title: "How to prepare your STL file for 3D printing",
    description:
      "Simple checks that prevent delays: units and scale, wall thickness, watertight meshes, tolerances for fitting parts and how to export STL, 3MF or STEP files.",
    category: "Design",
    publishedAt: "2026-11-26",
    updatedAt: "2026-11-27",
    readingMinutes: 5,
    tags: ["Design", "Guides", "Files"],
    quickAnswer:
      "Before sending an STL, export it in millimetres, make sure the mesh is closed (watertight), avoid walls and pins that are too thin, leave clearance on parts that fit together, and mention the overall size. Our quote page measures the model and flags open meshes automatically.",
    takeaways: [
      "Export in millimetres and state the expected size.",
      "Closed (watertight) meshes print reliably.",
      "Thin walls and tiny features are the most common problems.",
      "Use STEP for engineering parts; STL or 3MF for printing.",
    ],
    body: [
      {
        type: "p",
        text: "A clean, correctly scaled file is the fastest route to an accurate quotation and a successful print. These checks take a few minutes and avoid most back-and-forth.",
      },
      { type: "h2", text: "1. Check the units and scale" },
      {
        type: "p",
        text: "STL files don't store units. Export in millimetres and mention the expected overall size (for example 120 × 80 × 40 mm) in your request so we can confirm the scale.",
      },
      { type: "h2", text: "2. Make sure the model is watertight" },
      {
        type: "p",
        text: "The surface should be fully closed, without holes, flipped faces or overlapping shells. Most CAD tools produce clean meshes; models from scans or sculpting tools may need repair. Our quote page notes when a mesh has open edges.",
      },
      { type: "h2", text: "3. Avoid walls and features that are too thin" },
      {
        type: "p",
        text: "Very thin walls, pins and text can break or fail to print. If your design has delicate features, mention them and we'll advise whether FDM or SLA is the better fit.",
      },
      { type: "h2", text: "4. Plan clearance for parts that fit together" },
      {
        type: "p",
        text: "Holes, slots and snap-fits need a little clearance. Tell us which surfaces mate with other parts or hardware so we can check them before printing.",
      },
      { type: "h2", text: "5. Pick the best export format" },
      {
        type: "ul",
        items: [
          "STL — universal and accepted everywhere.",
          "3MF — keeps units, colours and multiple parts in one file.",
          "STEP / STP — preferred for engineering parts and any design work, because it keeps exact geometry.",
          "OBJ — common from sculpting and scanning tools.",
        ],
      },
      {
        type: "tip",
        text: "Don't have a 3D model? Share photos, a sketch or a drawing and tick “I need help creating the design” in the quote form.",
      },
    ],
    faqs: [
      { q: "What does watertight mean for an STL file?", a: "A watertight (manifold) mesh is a fully closed surface with no holes, so the printer software can tell inside from outside. Open meshes may print with gaps or fail." },
      { q: "What units should an STL be in?", a: "Millimetres. STL doesn't store units, so always mention the expected overall size when you send the file." },
    ],
    related: [
      { href: "/blog/3d-printing-design-guidelines", label: "Design guidelines" },
      { href: "/blog/stl-vs-step-vs-3mf-vs-obj-file-formats", label: "File formats explained" },
    ],
  },
];

export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug);

export const latestPosts = (n = 3) => [...posts].sort((a, b) => (b.updatedAt ?? b.publishedAt).localeCompare(a.updatedAt ?? a.publishedAt)).slice(0, n);

export const relatedPosts = (post: Post, n = 3) =>
  posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: p.tags.filter((t) => post.tags.includes(t)).length + (p.category === post.category ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p);
