import { PageTitle } from "@/shop/components/admin/kit";
import { SETTINGS_SECTIONS, SettingsSectionForm, ShippingMethodsForm } from "@/shop/components/admin/ContentSettings";
import { Notice } from "@/shop/components/ui";
import { requireAdminPage } from "@/shop/server/auth/admin";
import { shopIntegrations } from "@/shop/server/env";
import { getSettings } from "@/shop/server/settings";
import { integrations } from "@/lib/env";

export const metadata = { title: "Store settings" };

export default async function SettingsAdmin() {
  await requireAdminPage("settings");
  const s = await getSettings();
  const checks = [
    ["Database (Supabase)", true],
    ["Email (Resend)", integrations.email],
    ["Razorpay keys", shopIntegrations.razorpay],
    ["Razorpay webhook secret", shopIntegrations.razorpayWebhook],
    ["Shiprocket (optional)", shopIntegrations.shiprocket],
  ] as const;
  return (
    <>
      <PageTitle title="Store settings" subtitle="Currency is Indian Rupees (INR). Secrets such as API keys are set as environment variables, never here." />
      <div className="mb-6 card p-5">
        <h2 className="font-bold">Integrations</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {checks.map(([label, ok]) => <li key={label} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-success" : "bg-amber-500"}`} />{label}: {ok ? "configured" : "not configured"}</li>)}
        </ul>
        {!shopIntegrations.razorpay && <div className="mt-3"><Notice tone="warning">Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to accept online payments.</Notice></div>}
      </div>
      <div className="grid max-w-4xl gap-6">
        {SETTINGS_SECTIONS.map((sec) => <SettingsSectionForm key={sec.section} section={sec.section} title={sec.title} fields={sec.fields} value={s[sec.section] as unknown as Record<string, unknown>} />)}
        <ShippingMethodsForm value={s.shipping} />
      </div>
    </>
  );
}
