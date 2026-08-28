import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function PrivacyPage() {
  return (
    <div className="auth-shell">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <BrandLogo on="light" size="auth" />
        <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
        <p className="text-sm text-neutral-600">
          LeadDoc is software for dental practices. We store clinic accounts and the visitor details a patient types into
          the chat widget (name, email, phone, and enquiry) so the practice can follow up.
        </p>
        <p className="text-sm text-neutral-600">
          The lawful basis for that chat data is the clinic&apos;s legitimate interest in responding to an enquiry the
          visitor chose to send, or steps needed to provide a service the visitor asked for. Clinics are the controller of
          their own leads; LeadDoc processes that data to run the product.
        </p>
        <p className="text-sm text-neutral-600">
          We use subprocessors to host the app, send email, take payment, and generate chat replies. We do not sell visitor
          data. For a copy, correction, or deletion request, contact the practice you wrote to, or the LeadDoc operator if
          you have a clinic account.
        </p>
        <p className="text-sm">
          <Link href="/" className="font-semibold underline">
            Home
          </Link>
        </p>
      </div>
    </div>
  );
}
