import { assertAdmin } from "@/shop/server/auth/admin";
import { errorResponse } from "@/shop/server/http";
import { renderInvoiceHtml } from "@/shop/server/invoice";
import { getOrderById } from "@/shop/server/orders";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await assertAdmin("orders");
    const o = await getOrderById((await ctx.params).id);
    if (!o) return new Response("Not found", { status: 404 });
    return new Response(await renderInvoiceHtml(o), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  } catch (e) {
    return errorResponse(e);
  }
}
