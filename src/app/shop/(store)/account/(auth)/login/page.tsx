import { redirect } from "next/navigation";
import { LoginForm, safeNext } from "@/shop/components/account/AuthForms";
import { noIndex } from "@/shop/seo";
import { getCustomer } from "@/shop/server/auth/customer";

export const metadata = noIndex("Sign in");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCustomer()) redirect(safeNext(next));
  return (
    <>
      <h1 className="h-section">Sign in</h1>
      <p className="mt-2 text-muted">Welcome back! Sign in to view orders and check out faster.</p>
      <div className="mt-8"><LoginForm next={next} /></div>
    </>
  );
}
