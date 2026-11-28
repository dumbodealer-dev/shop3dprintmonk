import { z } from "zod";

/**
 * URL rules for anything that is later rendered as a link or loaded by the browser.
 * z.url() alone accepts javascript:, data: and other schemes, so every stored URL
 * goes through one of these.
 */
export const isHttpsUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
};

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

/** Images/models must come from our own Supabase public storage (also the only host next/image may optimise). */
export const isStorageUrl = (v: string) => {
  if (!isHttpsUrl(v) || !supabaseHost) return false;
  const u = new URL(v);
  return u.hostname === supabaseHost && u.pathname.startsWith("/storage/v1/object/public/");
};

const optional = <T extends z.ZodType>(s: T) => z.union([z.literal(""), z.null(), z.undefined(), s]).transform((v) => (v ? (v as string) : null));

/** Any https:// link (e.g. a courier tracking page). */
export const httpsUrlSchema = z.string().trim().max(1000).refine(isHttpsUrl, "Use a full https:// link");
export const optionalHttpsUrl = optional(httpsUrlSchema);

/** A file in the shop's own storage bucket (upload it in the admin to get one). */
export const storageUrlSchema = z.string().trim().max(1000).refine(isStorageUrl, "Upload the file in the admin (only images stored in the shop's storage are allowed)");
export const optionalStorageUrl = optional(storageUrlSchema);
