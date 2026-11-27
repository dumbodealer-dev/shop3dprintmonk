import { describe, expect, it } from "vitest";
import { generateReference, REFERENCE_PATTERN } from "./reference";

describe("generateReference", () => {
  it("uses the IST date and a readable suffix", () => {
    const ref = generateReference("PM", new Date("2026-11-26T20:00:00Z")); // 01:30 IST on the 27th
    expect(ref.startsWith("PM-261127-")).toBe(true);
    expect(ref).toMatch(REFERENCE_PATTERN);
  });
  it("is effectively unique", () => {
    const refs = new Set(Array.from({ length: 2000 }, () => generateReference()));
    expect(refs.size).toBeGreaterThan(1990);
  });
});
