import { redirect } from "next/navigation";
import { AccountNav } from "@/shop/components/account/AccountClient";
import { shopHref } from "@/shop/config";
import { getCustomer } from "@/shop/server/auth/customer";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer();
  if (!customer) redirect(shopHref("/account/login?next=/account"));
  return (
    <div className="container-x py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
