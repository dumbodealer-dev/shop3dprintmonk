import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthForm } from "@/shop/components/admin/AuthForms";
import { shopHref } from "@/shop/config";
import { adminCount, getAdmin } from "@/shop/server/auth/admin";
import { adminLogin } from "@/shop/server/admin/auth-actions";
import { shopConfigured } from "@/shop/server/db";

export const metadata = { title: "Sign in" };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (!shopConfigured()) return <p className="text-sm text-danger">The shop database isn&apos;t configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/shop-schema.sql.</p>;
  if (await getAdmin()) redirect(shopHref("/admin"));
  if ((await adminCount()) === 0) redirect(shopHref("/admin/setup"));
  const { reset } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Admin sign in</h1>
      {reset && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900">Password updated — sign in with your new password.</p>}
      <div className="mt-6">
        <AdminAuthForm action={adminLogin} submit="Sign in" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "username" }, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }]} />
      </div>
      <p className="mt-4 text-center text-sm"><Link href={shopHref("/admin/forgot")} className="font-semibold text-accent-ink hover:underline">Forgot password?</Link></p>
    </>
  );
}
