import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "./env";

/**
 * Small in-memory sliding-window limiter. Adequate for a single Node process
 * (Hostinger Node.js hosting / one VPS). Quote submissions are additionally
 * limited against the database, which survives restarts.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  // Prefer the header set by our own reverse proxy (Nginx/Hostinger: X-Real-IP = remote address).
  // X-Forwarded-For's first entry can be supplied by the client, so it is only a fallback.
  return headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** We store a salted hash, never the raw IP address. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${serverEnv.ipHashSalt}:${ip}`).digest("hex").slice(0, 32);
}
