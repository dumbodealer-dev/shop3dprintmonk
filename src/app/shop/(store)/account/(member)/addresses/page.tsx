import { redirect } from "next/navigation";
import { AddressBook, type AddressRow } from "@/shop/components/account/AccountClient";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";
import { db } from "@/shop/server/db";

export const metadata = noIndex("Addresses");

export default async function AddressesPage() {
  const customer = await getCustomer();
  if (!customer) redirect(shopHref("/account/login?next=/account/addresses"));
  const { data } = await db().from("shop_addresses").select("*").eq("customer_id", customer.id).order("created_at");
  return (
    <div>
      <h1 className="h-section">Saved addresses</h1>
      <p className="mt-2 text-muted">Used to fill in checkout automatically. Your default billing address appears on GST invoices.</p>
      <div className="mt-6"><AddressBook initial={(data ?? []) as AddressRow[]} /></div>
    </div>
  );
}
