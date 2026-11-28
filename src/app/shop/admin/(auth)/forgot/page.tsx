import { AdminAuthForm } from "@/shop/components/admin/AuthForms";
import { adminForgot } from "@/shop/server/admin/auth-actions";

export const metadata = { title: "Reset password" };

export default function AdminForgot() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Reset admin password</h1>
      <div className="mt-6"><AdminAuthForm action={adminForgot} submit="Email me a reset link" fields={[{ name: "email", label: "Admin email", type: "email", autoComplete: "username" }]} /></div>
    </>
  );
}
