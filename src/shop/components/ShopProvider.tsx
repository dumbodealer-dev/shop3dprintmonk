"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import type { PublicCart } from "@/shop/server/serialize";
import { track } from "@/lib/analytics";
import { api, ApiError } from "./api";

type Toast = { id: number; tone: "success" | "error"; text: string };

type Ctx = {
  cart: PublicCart | null;
  cartLoading: boolean;
  setCart: (c: PublicCart) => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity: number, customization?: Record<string, string | boolean>, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  wishlist: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  toast: (text: string, tone?: Toast["tone"]) => void;
};

const ShopContext = createContext<Ctx | null>(null);

export function useShop() {
  const c = useContext(ShopContext);
  if (!c) throw new Error("useShop must be used inside <ShopProvider>");
  return c;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<PublicCart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const toast = useCallback((text: string, tone: Toast["tone"] = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await api<PublicCart>("/cart"));
    } catch {
      /* the cart badge simply stays empty */
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of browser-specific state
    refreshCart();
    api<{ ids: string[] }>("/wishlist")
      .then((r) => setWishlist(new Set(r.ids)))
      .catch(() => {});
  }, [refreshCart]);

  const addToCart = useCallback<Ctx["addToCart"]>(
    async (variantId, quantity, customization = {}, opts = {}) => {
      try {
        const c = await api<PublicCart>("/cart", { body: { variantId, quantity, customization } });
        setCart(c);
        track("shop_add_to_cart", { value: c.totals.subtotal, currency: "INR" });
        if (opts.openDrawer !== false) setDrawerOpen(true);
        else toast("Added to your cart");
        return true;
      } catch (e) {
        toast(e instanceof ApiError ? e.message : "Couldn't add to cart.", "error");
        return false;
      }
    },
    [toast],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const on = !wishlist.has(productId);
      setWishlist((w) => {
        const n = new Set(w);
        if (on) n.add(productId);
        else n.delete(productId);
        return n;
      });
      try {
        const r = await api<{ ids: string[] }>("/wishlist", { body: { productId, on } });
        setWishlist(new Set(r.ids));
        toast(on ? "Saved to your wishlist" : "Removed from your wishlist");
      } catch (e) {
        setWishlist((w) => {
          const n = new Set(w);
          if (on) n.delete(productId);
          else n.add(productId);
          return n;
        });
        toast(e instanceof ApiError ? e.message : "Couldn't update your wishlist.", "error");
      }
    },
    [wishlist, toast],
  );

  const value = useMemo(
    () => ({ cart, cartLoading, setCart, refreshCart, addToCart, drawerOpen, setDrawerOpen, wishlist, toggleWishlist, toast }),
    [cart, cartLoading, refreshCart, addToCart, drawerOpen, wishlist, toggleWishlist, toast],
  );

  return (
    <ShopContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-2xl ${t.tone === "success" ? "bg-ink-900 text-white" : "bg-danger text-white"}`}>
            {t.tone === "success" ? <CircleCheck className="h-4 w-4 shrink-0 text-accent" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
            <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="-mr-2 rounded-full p-1 hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ShopContext.Provider>
  );
}
