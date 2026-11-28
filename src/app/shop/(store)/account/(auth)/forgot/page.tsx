import { ForgotForm } from "@/shop/components/account/AuthForms";
import { noIndex } from "@/shop/seo";

export const metadata = noIndex("Forgot password");

export default function ForgotPage() {
  return (
    <>
      <h1 className="h-section">Reset your password</h1>
      <p className="mt-2 text-muted">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
      <div className="mt-8"><ForgotForm /></div>
    </>
  );
}
