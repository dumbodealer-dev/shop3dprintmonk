import { business } from "@/config/business";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata = pageMetadata({ title: "Terms and Conditions", description: "Terms for using the 3D PRINTMONK website and requesting 3D printing quotations.", path: "/terms" });

// CONFIRM: replace or extend with your actual commercial terms (payment, cancellations, refunds, shipping) and have them legally reviewed.
export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions" path="/terms" updated="26 November 2026">
      <p>By using this website or submitting an enquiry to {business.legalName ?? business.name}, you agree to these terms.</p>
      <h2>Quotations</h2>
      <p>Quotations are prepared individually and are in Indian rupees (INR). A quotation is not an order; work begins only after you approve the design, material, price and any other terms stated in the quotation.</p>
      <h2>Your designs</h2>
      <ul>
        <li>You confirm that you own, or have permission to use, any files and designs you submit.</li>
        <li>You remain the owner of your designs. You give us permission to use them only to quote for and produce your order.</li>
        <li>We may decline to print items that infringe intellectual property, are unlawful or are unsafe.</li>
      </ul>
      <h2>Nature of 3D printed parts</h2>
      <p>
        3D printed parts can show layer lines, support marks and small dimensional variations that depend on the process, material and geometry.
        Where exact dimensions, tolerances or performance matter, state them in your enquiry so they can be reviewed and confirmed in the quotation.
      </p>
      <h2>Suitability</h2>
      <p>Unless agreed in writing, you are responsible for deciding whether a printed part is suitable for your intended use, especially for safety-critical, medical, food-contact or load-bearing applications.</p>
      <h2>Payment, delivery and cancellations</h2>
      <p>Payment terms, delivery timelines, shipping charges and cancellation conditions are specified in each quotation.</p>
      <h2>Website use</h2>
      <p>Do not misuse this website, attempt to access other customers&apos; data, or upload malicious files. Website content is provided for general information and may change without notice.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and courts in Delhi shall have jurisdiction.</p>
    </LegalPage>
  );
}
