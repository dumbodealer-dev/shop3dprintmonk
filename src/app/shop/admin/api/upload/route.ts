import { randomUUID } from "node:crypto";
import { extensionOf, sniffMatchesExtension } from "@/lib/files";
import { assertAdmin } from "@/shop/server/auth/admin";
import { db, ShopError } from "@/shop/server/db";
import { errorResponse, json, sameOrigin } from "@/shop/server/http";

export const dynamic = "force-dynamic";

const IMAGE = ["jpg", "jpeg", "png", "webp", "avif"];
const MODEL = ["stl", "obj", "3mf"];
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", stl: "model/stl", obj: "text/plain", "3mf": "model/3mf" };

function sniffAvif(b: Uint8Array) {
  return b.length > 12 && String.fromCharCode(...b.slice(4, 12)).startsWith("ftypavi");
}

/** Admin-only upload of product photos, banner images and 3D preview models to the public shop-media bucket. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) return json({ error: "Invalid origin" }, 403);
    await assertAdmin("products");
    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "products").replace(/[^a-z-]/g, "") || "products";
    if (!(file instanceof File) || !file.size) throw new ShopError("Choose a file.", 422);
    const ext = extensionOf(file.name);
    const isImage = IMAGE.includes(ext);
    if (!isImage && !MODEL.includes(ext)) throw new ShopError("Use JPG, PNG, WebP or AVIF images, or STL/OBJ/3MF models.", 422);
    const max = isImage ? 10 : 50;
    if (file.size > max * 1024 * 1024) throw new ShopError(`Files must be under ${max} MB.`, 422);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ok = ext === "avif" ? sniffAvif(bytes) : sniffMatchesExtension(ext, bytes.subarray(0, 4096), bytes.length);
    if (!ok) throw new ShopError(`This doesn't look like a valid .${ext} file.`, 422);
    const path = `${folder}/${new Date().getFullYear()}/${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
    const up = await db().storage.from("shop-media").upload(path, bytes, { contentType: TYPES[ext], cacheControl: "31536000", upsert: false });
    if (up.error) throw new ShopError(`Upload failed: ${up.error.message}`, 502);
    const { data } = db().storage.from("shop-media").getPublicUrl(path);
    return json({ url: data.publicUrl, path, kind: isImage ? "image" : "model" }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
