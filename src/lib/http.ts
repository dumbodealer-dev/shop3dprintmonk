import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Parse a JSON body with a size cap (protects against oversized payloads). */
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("Payload too large");
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Payload too large");
  return JSON.parse(text);
}

/** Basic same-origin check for browser POSTs (CSRF hardening). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients; other protections still apply
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Constant-time check of an `Authorization: Bearer <secret>` header. */
export function authorised(header: string | null, secret: string) {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
