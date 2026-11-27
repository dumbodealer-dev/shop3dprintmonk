/**
 * File-type rules shared by the browser (fast feedback) and the server
 * (authoritative checks). Pure functions — safe to import anywhere.
 */

export const MODEL_EXTENSIONS = ["stl", "obj", "3mf", "step", "stp"] as const;
export const REFERENCE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"] as const;

export type FileKind = "model" | "reference";

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function kindForExtension(ext: string): FileKind | null {
  if ((MODEL_EXTENSIONS as readonly string[]).includes(ext)) return "model";
  if ((REFERENCE_EXTENSIONS as readonly string[]).includes(ext)) return "reference";
  return null;
}

/** Allowed extensions for an upload. Reference images/PDFs only when design help is requested. */
export function allowedExtensions(allowReferences: boolean): string[] {
  return allowReferences ? [...MODEL_EXTENSIONS, ...REFERENCE_EXTENSIONS] : [...MODEL_EXTENSIONS];
}

/** Produce a storage-safe file name, keeping the extension. */
export function sanitizeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = (ext ? name.slice(0, -(ext.length + 1)) : name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

function asciiPrefix(b: Uint8Array, length = 4096): string {
  let s = "";
  const n = Math.min(b.length, length);
  for (let i = 0; i < n; i++) s += String.fromCharCode(b[i]);
  return s;
}

/** True when the sample looks like text (no NUL bytes, mostly printable). */
function looksTextual(b: Uint8Array): boolean {
  const n = Math.min(b.length, 4096);
  if (n === 0) return false;
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const c = b[i];
    if (c === 0) return false;
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || c >= 128) printable++;
  }
  return printable / n > 0.95;
}

/**
 * Check the real content of a file against its claimed extension using the
 * first bytes ("magic numbers"). `totalSize` is the full object size, used to
 * validate binary STL files whose header carries a triangle count.
 */
export function sniffMatchesExtension(ext: string, head: Uint8Array, totalSize: number): boolean {
  switch (ext) {
    case "stl": {
      const text = asciiPrefix(head, 512).trimStart().toLowerCase();
      if (text.startsWith("solid") && looksTextual(head)) return true; // ASCII STL
      // Binary STL: 80-byte header + uint32 triangle count + 50 bytes per triangle.
      if (head.length < 84) return false;
      const count = new DataView(head.buffer, head.byteOffset, head.byteLength).getUint32(80, true);
      return count > 0 && 84 + count * 50 === totalSize;
    }
    case "obj": {
      if (!looksTextual(head)) return false;
      return /^(v|vn|vt|f|o|g|mtllib|usemtl|s)\s/m.test(asciiPrefix(head));
    }
    case "3mf":
      return startsWith(head, [0x50, 0x4b, 0x03, 0x04]); // ZIP container
    case "step":
    case "stp":
      return asciiPrefix(head, 64).trimStart().startsWith("ISO-10303-21");
    case "jpg":
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "webp":
      return startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8);
    case "pdf":
      return startsWith(head, [0x25, 0x50, 0x44, 0x46]); // %PDF
    default:
      return false;
  }
}
