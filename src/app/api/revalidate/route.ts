import { revalidateTag } from "next/cache";
import { serverEnv } from "@/lib/env";
import { CONTENT_TAG } from "@/lib/content";
import { authorised, json } from "@/lib/http";

/**
 * Refresh materials & portfolio immediately after editing them in Supabase:
 *   curl -X POST https://www.3dprintmonk.com/api/revalidate -H "Authorization: Bearer $REVALIDATE_SECRET"
 * (Otherwise content refreshes automatically within 5 minutes.)
 */
export async function POST(request: Request) {
  if (!authorised(request.headers.get("authorization"), serverEnv.revalidateSecret)) return json({ error: "Unauthorised" }, 401);
  revalidateTag(CONTENT_TAG, "max");
  return json({ revalidated: true, at: new Date().toISOString() });
}
