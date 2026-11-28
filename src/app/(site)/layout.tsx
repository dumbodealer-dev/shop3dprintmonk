import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SetupBanner } from "@/components/layout/SetupBanner";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { whatsappLink } from "@/lib/whatsapp";

/** Chrome for the main 3D PRINTMONK website (the Shop under /shop has its own layout). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetupBanner />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <FloatingWhatsApp href={whatsappLink("general")} />
    </>
  );
}
