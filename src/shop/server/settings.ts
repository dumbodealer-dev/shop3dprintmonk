import "server-only";
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { business } from "@/config/business";
import { defaultSettings, settingsSchemas, type SettingsSection, type ShopSettings } from "@/shop/lib/settings-schema";
import { getSupabaseAdmin } from "@/lib/supabase";
import { db, must } from "./db";

export const SETTINGS_TAG = "shop-settings";

const load = unstable_cache(
  async (): Promise<ShopSettings> => {
    const out = defaultSettings();
    // Sensible defaults from the main website's business details.
    out.store.email = business.contact.email ?? "";
    out.store.supportEmail = business.contact.email ?? "";
    out.store.phone = business.contact.phone ?? "";
    out.store.whatsapp = business.contact.whatsapp ?? "";
    out.store.addressLine = [business.address.street, business.address.locality].filter(Boolean).join(", ");
    out.store.city = business.address.city;
    out.store.state = business.address.region;
    out.store.pincode = business.address.postalCode ?? "";
    out.store.instagram = business.social.instagram ?? "";
    out.store.legalName = business.legalName ?? "";
    out.store.gstin = business.policies.gstin ?? "";

    const client = getSupabaseAdmin();
    if (!client) return out;
    const { data, error } = await client.from("shop_settings").select("key, value");
    if (error) {
      console.error("[shop] settings load failed:", error.message);
      return out;
    }
    for (const row of data ?? []) {
      const key = row.key as SettingsSection;
      const schema = settingsSchemas[key];
      if (!schema) continue;
      const parsed = schema.safeParse({ ...out[key], ...(row.value as object) });
      if (parsed.success) (out as Record<string, unknown>)[key] = parsed.data;
      else console.error(`[shop] invalid stored settings for ${key}`);
    }
    return out;
  },
  ["shop-settings"],
  { revalidate: 300, tags: [SETTINGS_TAG] },
);

/** All store settings (cached; refreshed immediately when saved in the admin). */
export const getSettings = cache(() => load());

export async function saveSettings<K extends SettingsSection>(key: K, value: unknown): Promise<ShopSettings[K]> {
  const parsed = settingsSchemas[key].parse(value) as ShopSettings[K];
  must(await db().from("shop_settings").upsert({ key, value: parsed, updated_at: new Date().toISOString() }), "save settings");
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  return parsed;
}
