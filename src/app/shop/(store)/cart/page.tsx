import { CartPage } from "@/shop/components/CartPage";
import { noIndex } from "@/shop/seo";

export const metadata = noIndex("Your cart");

export default function Cart() {
  return (
    <div className="container-x py-10">
      <h1 className="h-section mb-8">Your cart</h1>
      <CartPage />
    </div>
  );
}
