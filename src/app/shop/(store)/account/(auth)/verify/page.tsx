import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { shopHref } from "@/shop/config";
import { noIndex } from "@/shop/seo";
import { verifyCustomerEmail } from "@/shop/server/auth/customer";
import { shopConfigured } from "@/shop/server/db";

export const metadata = noIndex("Verify email");

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = !!token && shopConfigured() && (await verifyCustomerEmail(token));
  return (
    <div className="text-center">
      {ok ? <CircleCheck className="mx-auto h-12 w-12 text-success" /> : <TriangleAlert className="mx-auto h-12 w-12 text-warning" />}
      <h1 className="h-section mt-4">{ok ? "Email confirmed" : "Link expired or already used"}</h1>
      <p className="mt-2 text-muted">{ok ? "Thanks — your account is all set." : "Sign in and use “Resend verification email” from your account page to get a fresh link."}</p>
      <Link href={shopHref(ok ? "/products" : "/account")} className="mt-8 inline-flex h-12 items-center rounded-full bg-ink-900 px-7 font-semibold text-white">{ok ? "Start shopping" : "Go to my account"}</Link>
    </div>
  );
}
