import { Lock } from "lucide-react";
import { CheckoutForm, type SavedAddress } from "@/shop/components/checkout/CheckoutForm";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { db } from "@/shop/server/db";
import { getSettings } from "@/shop/server/settings";

export const metadata = noIndex("Checkout");
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [customer, settings] = await Promise.all([getCustomer(), getSettings()]);
  let addresses: SavedAddress[] = [];
  if (customer) {
    const { data } = await db().from("shop_addresses").select("*").eq("customer_id", customer.id).order("created_at");
    addresses = (data ?? []).map((a) => ({
      id: a.id, label: a.label, fullName: a.full_name, phone: a.phone.replace(/^\+91/, ""), line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "",
      city: a.city, state: a.state, pincode: a.pincode, isDefaultShipping: a.is_default_shipping, isDefaultBilling: a.is_default_billing,
    }));
  }
  return (
    <div className="container-x py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="h-section">Checkout</h1>
        <p className="hidden items-center gap-2 text-sm text-muted sm:flex"><Lock className="h-4 w-4" /> Secure checkout</p>
      </div>
      <CheckoutForm
        customer={customer ? { email: customer.email, fullName: customer.fullName, phone: customer.phone?.replace(/^\+91/, "") ?? null } : null}
        addresses={addresses}
        gstEnabled={settings.tax.enableGstInvoice}
        codFee={settings.payments.codFee}
      />
    </div>
  );
}
