import { redirect } from "next/navigation";
import { DeleteAccount, PasswordForm, ProfileForm } from "@/shop/components/account/AccountClient";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";

export const metadata = noIndex("Profile & security");

export default async function SecurityPage() {
  const c = await getCustomer();
  if (!c) redirect(shopHref("/account/login?next=/account/security"));
  return (
    <div className="space-y-6">
      <h1 className="h-section">Profile & security</h1>
      <p className="text-sm text-muted">Signed in as <strong className="text-text">{c.email}</strong>{c.emailVerified ? " · verified" : " · not verified yet"}</p>
      <ProfileForm initial={{ fullName: c.fullName, phone: c.phone?.replace(/^\+91/, "") ?? "", marketingOptIn: c.marketingOptIn }} />
      <PasswordForm />
      <DeleteAccount requestedAt={c.deletionRequestedAt} />
    </div>
  );
}
