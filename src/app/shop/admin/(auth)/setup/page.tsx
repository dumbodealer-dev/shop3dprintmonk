import { redirect } from "next/navigation";
import { AdminAuthForm } from "@/shop/components/admin/AuthForms";
import { shopHref } from "@/shop/config";
import { adminCount } from "@/shop/server/auth/admin";
import { adminSetup } from "@/shop/server/admin/auth-actions";
import { shopConfigured } from "@/shop/server/db";

export const metadata = { title: "First-time setup" };

/** Creates the first owner account. Only works while no admin exists and with SHOP_ADMIN_SETUP_TOKEN. */
export default async function AdminSetup() {
  if (!shopConfigured()) return <p className="text-sm text-danger">Configure Supabase first.</p>;
  if ((await adminCount()) > 0) redirect(shopHref("/admin/login"));
  return (
    <>
      <h1 className="text-2xl font-extrabold">Create the owner account</h1>
      <p className="mt-2 text-sm text-muted">One-time setup. Enter the value of <code>SHOP_ADMIN_SETUP_TOKEN</code> from your environment variables.</p>
      <div className="mt-6">
        <AdminAuthForm action={adminSetup} submit="Create owner account" fields={[
          { name: "token", label: "Setup token", type: "password" },
          { name: "fullName", label: "Your name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "username" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters, with letters and a number" },
        ]} />
      </div>
    </>
  );
}
