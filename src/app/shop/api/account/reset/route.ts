import { resetCustomerPassword, startCustomerSession } from "@/shop/server/auth/customer";
import { ShopError } from "@/shop/server/db";
import { body, json, route } from "@/shop/server/http";
import { resetSchema } from "@/shop/lib/validation";

export const POST = route(
  async (req) => {
    const { token, password } = resetSchema.parse(await body(req));
    const id = await resetCustomerPassword(token, password);
    if (!id) throw new ShopError("This reset link is invalid or has expired. Please request a new one.", 400);
    await startCustomerSession(id);
    return json({ ok: true });
  },
  { rate: ["reset", 10, 60 * 60_000] },
);
