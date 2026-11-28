import { endCustomerSession } from "@/shop/server/auth/customer";
import { json, route } from "@/shop/server/http";

export const POST = route(async () => {
  await endCustomerSession();
  return json({ ok: true });
});
