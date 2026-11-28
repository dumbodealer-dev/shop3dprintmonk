import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { fieldErrors } from "@/shop/lib/validation";
import { ShopError } from "./db";

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * CSRF hardening for cookie-authenticated endpoints: browsers always send Origin
 * (or Sec-Fetch-Site) on cross-site POSTs, so a mismatch is rejected.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

type Handler = (request: Request, ctx: { ip: string }) => Promise<Response>;

/** Wraps a mutating route: origin check, optional rate limit, uniform error responses. */
export function route(handler: Handler, opts: { rate?: [string, number, number]; csrf?: boolean } = {}) {
  return async (request: Request) => {
    try {
      if (opts.csrf !== false && request.method !== "GET" && !sameOrigin(request)) return json({ error: "Invalid origin" }, 403);
      const ip = clientIp(request.headers);
      if (opts.rate) {
        const [name, limit, windowMs] = opts.rate;
        const rl = rateLimit(`shop:${name}:${ip}`, limit, windowMs);
        if (!rl.ok) return json({ error: "Too many requests. Please wait a moment and try again." }, 429, { "Retry-After": String(rl.retryAfterSec) });
      }
      return await handler(request, { ip });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof ShopError) return json({ error: err.message, code: err.code, fields: err.fields }, err.status);
  if (err instanceof ZodError) return json({ error: "Please check the highlighted fields.", fields: fieldErrors(err) }, 422);
  console.error("[shop] unhandled error:", err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

export async function body(request: Request, maxBytes = 32 * 1024): Promise<unknown> {
  try {
    return await readJson(request, maxBytes);
  } catch {
    throw new ShopError("Invalid request", 400);
  }
}
