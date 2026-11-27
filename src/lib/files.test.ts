import { describe, expect, it } from "vitest";
import { allowedExtensions, extensionOf, sanitizeFileName, sniffMatchesExtension } from "./files";

const enc = (s: string) => new TextEncoder().encode(s);

function binaryStl(triangles: number) {
  const buf = new Uint8Array(84 + triangles * 50);
  new DataView(buf.buffer).setUint32(80, triangles, true);
  return buf;
}

describe("file helpers", () => {
  it("extracts extensions case-insensitively", () => {
    expect(extensionOf("Bracket.V2.STL")).toBe("stl");
    expect(extensionOf("noext")).toBe("");
  });

  it("sanitises names", () => {
    expect(sanitizeFileName("../../etc/pass wd.stl")).toBe("etc-pass-wd.stl");
    expect(sanitizeFileName("मॉडल.obj")).toMatch(/\.obj$/);
  });

  it("only allows reference files when design help is requested", () => {
    expect(allowedExtensions(false)).not.toContain("jpg");
    expect(allowedExtensions(true)).toContain("pdf");
  });
});

describe("content sniffing", () => {
  it("accepts ASCII and binary STL", () => {
    expect(sniffMatchesExtension("stl", enc("solid part\nfacet normal 0 0 1\n"), 40)).toBe(true);
    const bin = binaryStl(3);
    expect(sniffMatchesExtension("stl", bin, bin.length)).toBe(true);
  });

  it("rejects a binary STL whose size does not match its triangle count", () => {
    const bin = binaryStl(3);
    expect(sniffMatchesExtension("stl", bin, bin.length + 7)).toBe(false);
  });

  it("rejects an executable renamed to .stl", () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, ...new Array(200).fill(0)]);
    expect(sniffMatchesExtension("stl", exe, 204)).toBe(false);
  });

  it("recognises OBJ, STEP, 3MF, PNG and PDF", () => {
    expect(sniffMatchesExtension("obj", enc("# comment\nv 0 0 0\nv 1 0 0\nf 1 2 3\n"), 30)).toBe(true);
    expect(sniffMatchesExtension("step", enc("ISO-10303-21;\nHEADER;"), 20)).toBe(true);
    expect(sniffMatchesExtension("3mf", new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2]), 6)).toBe(true);
    expect(sniffMatchesExtension("png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 8)).toBe(true);
    expect(sniffMatchesExtension("pdf", enc("%PDF-1.7"), 8)).toBe(true);
    expect(sniffMatchesExtension("step", enc("<html>"), 6)).toBe(false);
  });
});
