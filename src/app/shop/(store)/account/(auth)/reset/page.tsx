import Link from "next/link";
import { ResetForm } from "@/shop/components/account/AuthForms";
import { Notice } from "@/shop/components/ui";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";

export const metadata = noIndex("Choose a new password");

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="h-section">Choose a new password</h1>
      <div className="mt-8">
        {token ? <ResetForm token={token} /> : <Notice tone="danger">This link is incomplete. <Link href={shopHref("/account/forgot")} className="underline">Request a new one</Link>.</Notice>}
      </div>
    </>
  );
}
