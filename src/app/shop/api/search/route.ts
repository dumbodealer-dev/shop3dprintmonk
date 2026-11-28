import { searchSuggestions } from "@/shop/server/catalog";
import { json, route } from "@/shop/server/http";

export const GET = route(
  async (req) => {
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return json(await searchSuggestions(q), 200, { "Cache-Control": "public, max-age=30" });
  },
  { rate: ["search", 120, 60_000] },
);
