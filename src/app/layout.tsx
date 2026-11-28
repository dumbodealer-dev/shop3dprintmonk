import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { business } from "@/config/business";
import { Analytics } from "@/components/analytics/Analytics";
import { JsonLd } from "@/components/ui/JsonLd";
import { organizationJsonLd } from "@/lib/seo";

// Self-hosted variable fonts (no runtime request to Google Fonts).
const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});
const jetbrains = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(business.siteUrl),
  title: {
    default: "3D PRINTMONK — 3D Printing Services in Delhi NCR & India | FDM & SLA",
    template: "%s | 3D PRINTMONK",
  },
  description:
    "Custom FDM and SLA resin 3D printing in Delhi — prototypes, bulk production, 3D design and finishing. Upload your STL, STEP or idea for a quote. Delivery across India and worldwide.",
  applicationName: business.name,
  openGraph: { siteName: business.name, locale: "en_IN", type: "website" },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#120d0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        {/* Site chrome (header/footer) lives in app/(site)/layout.tsx; the shop has its own in app/shop. */}
        {children}
        <Analytics />
        <JsonLd data={organizationJsonLd()} />
      </body>
    </html>
  );
}
