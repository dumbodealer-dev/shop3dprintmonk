import { AdminAuthForm } from "@/shop/components/admin/AuthForms";
import { adminReset } from "@/shop/server/admin/auth-actions";

export const metadata = { title: "Choose a new password" };

export default async function AdminReset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      <div className="mt-6">
        <AdminAuthForm action={adminReset} submit="Set password" hidden={{ token }} fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters, with letters and a number" }, { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" }]} />
      </div>
    </>
  );
}
