import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const lastUpdated = "May 2026";
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-3xl py-12">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

          <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
            <h2>1. Who we are</h2>
            <p>
              Workpin is a marketplace that connects clients with independent service professionals
              ("Pros") in Kenya, Uganda, Tanzania and Rwanda. By creating an account or using the
              service you agree to these Terms.
            </p>

            <h2>2. Your account</h2>
            <p>
              You must be at least 18 years old. You are responsible for the accuracy of the
              information you provide and for keeping your login credentials secure. We may suspend
              or close accounts that breach these Terms.
            </p>

            <h2>3. Acceptable use</h2>
            <ul>
              <li>No fraudulent, unlawful, or misleading listings or requests.</li>
              <li>No harassment, hate speech, or unsolicited marketing toward other users.</li>
              <li>No attempts to bypass platform fees, take payments off-platform, or scrape data.</li>
              <li>No content that infringes third-party rights.</li>
            </ul>

            <h2>4. Pros and Clients</h2>
            <p>
              Pros are independent contractors, not employees of Workpin. We do not guarantee the
              quality, safety, or legality of any service. Clients are responsible for vetting Pros
              before engaging them; Pros are responsible for delivering the work they agree to.
            </p>

            <h2>5. Payments</h2>
            <p>
              Payments are processed by third-party providers (currently Pesapal and Paystack) and
              may include local payment methods such as M-Pesa, MTN MoMo, Airtel Money and card
              payments. Subscription fees and applicable platform fees are disclosed before you
              confirm any payment. Refunds, where applicable, follow the rules of the underlying
              payment method.
            </p>

            <h2>6. Disputes</h2>
            <p>
              If a dispute arises between a Client and a Pro, both parties should first attempt to
              resolve it directly. Workpin may, at its discretion, mediate by reviewing the work
              thread, evidence and review history, but is not obligated to do so.
            </p>

            <h2>7. Intellectual property</h2>
            <p>
              You retain ownership of content you upload (photos, descriptions, reviews) and grant
              Workpin a worldwide, royalty-free license to host and display it for the purpose of
              operating the service.
            </p>

            <h2>8. Termination</h2>
            <p>
              You may close your account at any time. We may suspend or terminate access for breach
              of these Terms or for legal or security reasons.
            </p>

            <h2>9. Liability</h2>
            <p>
              To the fullest extent permitted by law, Workpin is not liable for indirect or
              consequential losses arising from use of the platform or services arranged through it.
            </p>

            <h2>10. Governing law</h2>
            <p>
              These Terms are governed by the laws of the Republic of Kenya. Disputes will be
              submitted to the non-exclusive jurisdiction of the Kenyan courts.
            </p>

            <h2>11. Changes</h2>
            <p>
              We may update these Terms; material changes will be communicated by email or in-app
              notice. Continued use after changes take effect constitutes acceptance.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions? Reach us at <a href="mailto:support@workpin.app">support@workpin.app</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
