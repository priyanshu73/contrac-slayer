"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  const locale = useLocale()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
            <Link href={`/${locale}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
      <article className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: February 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ContractorOps AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the ContractorOps AI platform and related services (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Account and profile information:</strong> Name, email address, company name, phone number, and other details you provide when signing up or managing your contractor profile.</li>
              <li><strong className="text-foreground">Client and job data:</strong> Information about your clients (names, contact details, addresses) and jobs, quotes, and invoices you create through the Service.</li>
              <li><strong className="text-foreground">Usage and device information:</strong> Log data, IP address, browser type, device information, and how you interact with the Service.</li>
              <li><strong className="text-foreground">Communications:</strong> If you connect Gmail or use SMS features, we process messages and related data necessary to provide those features (e.g., sending quote emails or follow-up messages on your behalf).</li>
              <li><strong className="text-foreground">Payment information:</strong> Billing and payment-related data is processed by our payment provider (e.g., Stripe); we do not store full card numbers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide, operate, and improve the Service (quotes, jobs, invoices, scheduling, and communications).</li>
              <li>Authenticate you and manage your account.</li>
              <li>Send transactional emails and, with your consent or where permitted, marketing communications.</li>
              <li>Enable integrations you choose (e.g., Gmail for sending emails, Contractor AI / Twilio for SMS).</li>
              <li>Comply with legal obligations, enforce our terms, and protect our rights and safety.</li>
              <li>Analyze usage to improve the product and support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Third-Party Services and Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use third-party services to run the Service. These may include cloud hosting, email delivery (e.g., Gmail API when you connect Gmail), SMS (e.g., Twilio), payment processing (e.g., Stripe), and analytics. These providers have their own privacy policies and process data as necessary to provide their services to us. We do not sell your personal information. We may share information with your consent, to comply with law, or to protect rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Data Retention and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide the Service and comply with legal obligations. We implement reasonable technical and organizational measures to protect your data against unauthorized access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Cookies and Similar Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies for authentication, preferences, and to understand how the Service is used. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your location, you may have the right to access, correct, delete, or port your personal data, or to object to or restrict certain processing. You can update much of your information in your account settings. To exercise other rights or ask questions, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Children</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed to individuals under 16. We do not knowingly collect personal information from children under 16.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or requests, contact us at:
            </p>
            <p className="mt-2 text-foreground">
              ContractorOps AI<br />
              The Green, Dover, DE 19901<br />
              Website: www.contractorops.ai<br />
              Email: support@contractorops.ai
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Button variant="outline" asChild>
            <Link href={`/${locale}`}>Back to home</Link>
          </Button>
        </div>
      </article>
    </div>
  )
}
