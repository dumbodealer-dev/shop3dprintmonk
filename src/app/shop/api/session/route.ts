import { getCustomer } from "@/shop/server/auth/customer";
import { json, route } from "@/shop/server/http";

export const dynamic = "force-dynamic";

/** Who is signed in (for the header). Never cached. */
export const GET = route(async () => {
  const c = await getCustomer();
  return json({ customer: c ? { firstName: c.fullName.split(" ")[0], emailVerified: c.emailVerified } : null });
});
