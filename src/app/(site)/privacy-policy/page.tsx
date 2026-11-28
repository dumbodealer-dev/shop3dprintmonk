import Link from "next/link";
import { business } from "@/config/business";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/ui/LegalPage";

export const metadata = pageMetadata({ title: "Privacy Policy", description: "How 3D PRINTMONK collects, uses and protects your personal information and uploaded files.", path: "/privacy-policy" });

// CONFIRM: have this policy reviewed against your actual practices and India's Digital Personal Data Protection Act, 2023.
export default function PrivacyPage() {
  const owner = business.legalName ?? business.name;
  const contact = business.contact.email ? <a href={`mailto:${business.contact.email}`}>{business.contact.email}</a> : <Link href="/contact">our contact page</Link>;
  return (
    <LegalPage title="Privacy Policy" path="/privacy-policy" updated="26 November 2026">
      <p>This policy explains how {owner} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles information you share through {business.siteUrl.replace(/^https?:\/\//, "")}.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Enquiry details</strong> you submit: name, company, email, phone, city, project details and preferences.</li>
        <li><strong>Files you upload</strong>: 3D models, drawings, images and documents attached to an enquiry.</li>
        <li><strong>Technical data</strong>: a one-way hashed version of your IP address (used only for spam and abuse prevention) and your browser type.</li>
        <li><strong>Analytics</strong>: only if you accept analytics cookies — anonymised page usage via Google Analytics. We never send your contact details or files to analytics.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To review your project, prepare quotations, communicate with you and fulfil orders.</li>
        <li>To send you a confirmation of your enquiry and related service messages.</li>
        <li>To protect the website from spam and misuse.</li>
      </ul>
      <p>We do not sell your personal information and do not use it for unrelated marketing without your consent.</p>
      <h2>Your files and designs</h2>
      <p>
        Uploaded files are stored in private storage that is not publicly accessible. They are accessed only by our team to evaluate and produce your
        project. We do not publish your designs or photographs of your parts without your permission.
      </p>
      <h2>Service providers</h2>
      <p>
        We use trusted providers to run this website: database and file storage (Supabase), transactional email (Resend), hosting (Hostinger) and,
        with your consent, Google Analytics. They process data on our behalf and only as needed to provide their services.
      </p>
      <h2>Retention</h2>
      <p>We keep enquiry records and files for as long as needed to serve you, handle repeat orders and meet legal and accounting obligations. Files uploaded but never submitted are deleted automatically.</p>
      <h2>Your rights</h2>
      <p>You can ask us to access, correct or delete your personal information, or withdraw consent, by contacting {contact}.</p>
      <h2>Cookies</h2>
      <p>Essential functionality works without cookies. Analytics cookies are set only if you click &ldquo;Accept&rdquo; on the cookie notice. You can change your choice by clearing this site&apos;s data in your browser.</p>
      <h2>Contact</h2>
      <p>Questions about this policy? Contact us at {contact}.</p>
    </LegalPage>
  );
}
