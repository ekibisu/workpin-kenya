import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const lastUpdated = "May 2026";
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-background">
        <div className="container max-w-3xl py-12">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

          <div className="prose prose-sm dark:prose-invert mt-8 max-w-none">
            <h2>1. What we collect</h2>
            <ul>
              <li><strong>Account data:</strong> name, email, phone, country, password hash.</li>
              <li><strong>Profile data (Pros):</strong> business name, services, gallery, location, certifications.</li>
              <li><strong>Job data:</strong> requests, quotes, messages, reviews.</li>
              <li><strong>Payment data:</strong> mobile-money phone number, payment provider transaction references. We do <em>not</em> store full card numbers.</li>
              <li><strong>Device & usage:</strong> IP, browser, pages visited.</li>
            </ul>

            <h2>2. How we use it</h2>
            <ul>
              <li>To operate the marketplace: matching Clients to Pros, sending notifications, processing payments.</li>
              <li>To prevent fraud, abuse, and policy violations.</li>
              <li>To improve the product (analytics, debugging).</li>
              <li>To communicate service updates and, with your consent, marketing.</li>
            </ul>

            <h2>3. Who we share with</h2>
            <ul>
              <li><strong>Lovable Cloud</strong> — our backend and database provider.</li>
              <li><strong>Payment processors</strong> — Pesapal and Paystack to process subscriptions and transactions.</li>
              <li><strong>Other users</strong> — your public profile (name, business, reviews) is visible to other users; your phone and email are only shared once you engage with another user (e.g. accept a quote).</li>
              <li><strong>Authorities</strong> — when required by law.</li>
            </ul>
            <p>We do not sell your personal data.</p>

            <h2>4. Where we store data</h2>
            <p>Data is stored on infrastructure operated by our cloud provider, with regional redundancy. Some processing may occur outside your country.</p>

            <h2>5. Retention</h2>
            <p>
              We keep account and transaction data for as long as your account is active and for a
              reasonable period afterwards to satisfy legal, tax and dispute-resolution
              requirements.
            </p>

            <h2>6. Your rights</h2>
            <ul>
              <li>Access, correct, or export your data via Settings or by contacting us.</li>
              <li>Request deletion of your account.</li>
              <li>Opt out of marketing communications at any time.</li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
              We use first-party cookies and local storage for authentication, country preference,
              and basic analytics. You can clear them in your browser settings.
            </p>

            <h2>8. Children</h2>
            <p>The service is not intended for users under 18.</p>

            <h2>9. Changes</h2>
            <p>
              We may update this Policy; material changes will be communicated by email or in-app
              notice.
            </p>

            <h2>10. Contact</h2>
            <p>
              Privacy questions: <a href="mailto:privacy@workpin.app">privacy@workpin.app</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
