import { describe, expect, it } from "vitest";
import { analyzeTriangles } from "./mesh";
import { estimate, type EstimateInput } from "./estimate";

/** Closed axis-aligned box as a triangle soup (12 triangles). */
function box(w: number, d: number, h: number): number[] {
  const v = [
    [0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0],
    [0, 0, h], [w, 0, h], [w, d, h], [0, d, h],
  ];
  const f = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  return f.flatMap((t) => t.flatMap((i) => v[i]));
}

/** Box shifted up by z0 (e.g. an overhanging shelf) — combined with a base pillar below. */
function raised(w: number, d: number, h: number, z0: number): number[] {
  return box(w, d, h).map((v, i) => (i % 3 === 2 ? v + z0 : v));
}

const base: Omit<EstimateInput, "parts"> = {
  technology: "fdm",
  materialSlug: "pla",
  quantity: 1,
  finishing: [],
  enquiryType: "quote",
  needsDesign: false,
  unanalysedFiles: 0,
  materials: [{ slug: "pla", name: "PLA", technology: "fdm" }, { slug: "standard-resin", name: "Standard resin", technology: "sla" }],
};

describe("mesh analysis", () => {
  it("measures a 20 mm cube", () => {
    const a = analyzeTriangles(box(20, 20, 20));
    expect(a.volumeMm3).toBeCloseTo(8000, 3);
    expect(a.areaMm2).toBeCloseTo(2400, 3);
    expect(a.size).toEqual([20, 20, 20]);
    expect(a.watertight).toBe(true);
  });
  it("needs no supports for a cube sitting on the plate", () => {
    const a = analyzeTriangles(box(20, 20, 20));
    expect(a.supportFdmMm3).toBe(0);
    expect(a.supportSlaMm3).toBe(0);
  });

  it("measures support volume under an overhang", () => {
    // 10 mm pillar with a 40×40 shelf on top at z = 10
    const shape = [...box(10, 10, 10), ...raised(40, 40, 5, 10)];
    const a = analyzeTriangles(shape);
    expect(a.supportFdmMm3).toBeCloseTo(40 * 40 * 10, 0);
    expect(a.overhangAreaMm2).toBeCloseTo(1600, 0);
  });

  it("detects an open mesh", () => {
    expect(analyzeTriangles(box(10, 10, 10).slice(0, 9 * 11)).watertight).toBe(false);
  });
});

describe("instant estimate", () => {
  const cube = { name: "cube.stl", analysis: analyzeTriangles(box(50, 50, 50)) };

  it("gives an instant price range for a simple FDM part", () => {
    const e = estimate({ ...base, parts: [cube] });
    expect(e.mode).toBe("instant");
    expect(e.lines[0].grams).toBeGreaterThan(20);
    expect(e.low).toBeLessThan(e.total);
    expect(e.high).toBeGreaterThan(e.total);
  });

  it("adds support material and reports it per part", () => {
    const shelf = { name: "shelf.stl", analysis: analyzeTriangles([...box(10, 10, 10), ...raised(40, 40, 5, 10)]) };
    const fdm = estimate({ ...base, parts: [shelf] }).lines[0];
    expect(fdm.supportGrams).toBeGreaterThan(0);
    expect(fdm.supportCost).toBeGreaterThan(0);
    expect(fdm.grams).toBeCloseTo(fdm.modelGrams + fdm.supportGrams, 0);
    const flat = estimate({ ...base, parts: [cube] }).lines[0];
    expect(flat.supportGrams).toBe(0);
    const sla = estimate({ ...base, technology: "sla", materialSlug: "standard-resin", parts: [cube] }).lines[0];
    expect(sla.supportGrams).toBeGreaterThan(0); // resin raft
  });

  it("charges resin more than PLA for the same part", () => {
    const pla = estimate({ ...base, parts: [cube] });
    const sla = estimate({ ...base, technology: "sla", materialSlug: "standard-resin", parts: [cube] });
    expect(sla.total).toBeGreaterThan(pla.total);
  });

  it("charges the ₹300 minimum when the weight-based cost is lower", () => {
    const e = estimate({ ...base, parts: [{ name: "pin.stl", analysis: analyzeTriangles(box(5, 5, 5)) }] });
    expect(e.printCost).toBeLessThan(300);
    expect(e.minimumApplied).toBe(true);
    expect(e.total).toBe(300);
    expect(e.low).toBe(300);
    expect(e.high).toBe(300);
  });

  it("charges the actual cost above the ₹300 minimum", () => {
    const e = estimate({ ...base, parts: [{ name: "block.stl", analysis: analyzeTriangles(box(100, 100, 60)) }] });
    expect(e.printCost).toBeGreaterThan(300);
    expect(e.minimumApplied).toBe(false);
    expect(e.total).toBe(e.printCost);
    expect(e.low).toBeLessThan(e.high);
  });

  it("gives large parts an instant estimate (no build-size limit)", () => {
    const e = estimate({ ...base, parts: [{ name: "big.stl", analysis: analyzeTriangles(box(400, 50, 50)) }] });
    expect(e.mode).toBe("instant");
    expect(e.reasons).toEqual([]);
  });

  it("routes bulk, painted and STEP-only orders to manual quotes", () => {
    expect(estimate({ ...base, parts: [cube], quantity: 100 }).mode).toBe("manual");
    expect(estimate({ ...base, parts: [cube], enquiryType: "bulk" }).mode).toBe("manual");
    expect(estimate({ ...base, parts: [cube], finishing: ["painting"] }).mode).toBe("manual");
    expect(estimate({ ...base, parts: [], unanalysedFiles: 1 }).mode).toBe("manual");
  });

  it("applies quantity discounts", () => {
    const one = estimate({ ...base, parts: [cube] }).lines[0];
    const ten = estimate({ ...base, parts: [cube], quantity: 10 }).lines[0];
    expect(ten.discount).toBe(0.1);
    expect(ten.subtotal).toBeLessThan(one.subtotal * 10);
  });
});
