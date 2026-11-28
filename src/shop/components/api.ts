import { shopHref } from "@/shop/config";

/** Browser helper for the shop's JSON API. Throws ApiError with server-provided messages and field errors. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>, public code?: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(shopHref(`/api${path}`), {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Network error — check your connection and try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string>; code?: string };
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status, data.fields, data.code);
  return data;
}
