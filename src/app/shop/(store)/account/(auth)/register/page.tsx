import { redirect } from "next/navigation";
import { RegisterForm } from "@/shop/components/account/AuthForms";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";

export const metadata = noIndex("Create an account");

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCustomer()) redirect(shopHref("/account"));
  return (
    <>
      <h1 className="h-section">Create an account</h1>
      <p className="mt-2 text-muted">It takes 30 seconds. We&apos;ll email you a link to confirm your address.</p>
      <div className="mt-8"><RegisterForm next={next} /></div>
    </>
  );
}
