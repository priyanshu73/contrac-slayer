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
      <article className="container mx-auto max-w-3xl px-4 py-8 sm:py-10 md:py-14">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="rounded-2xl border border-border/70 bg-card/90 p-4 text-sm text-muted-foreground shadow-sm mb-8 md:mb-10 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          Last updated: September 2026
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ContractorOps AI (&quot;ContractorOps,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the ContractorOps AI platform, mobile applications, and related operations services for trade and construction contractors (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Account and profile information:</strong> Name, email address, company name, phone number, trade specialty, and other details you provide when signing up or managing your contractor profile.</li>
              <li><strong className="text-foreground">Client and job data:</strong> Information about your clients (names, contact details, project addresses) and jobs, estimates, quotes, change orders, and invoices created through the Service.</li>
              <li><strong className="text-foreground">Connected service data (e.g., Google integration):</strong> If you choose to connect third-party integrations such as Google Workspace, Gmail, or Google Calendar, we access only the specific data scopes you authorize via OAuth (such as sending emails on your behalf, checking calendar availability for on-site visits, and reading incoming client inquiries).</li>
              <li><strong className="text-foreground">Usage and device information:</strong> Log data, IP address, browser type, device identifiers, and how you interact with the Service.</li>
              <li><strong className="text-foreground">Communications:</strong> Message history and related metadata necessary to provide messaging and customer support features (e.g., sending quote emails or SMS follow-ups on your behalf).</li>
              <li><strong className="text-foreground">Payment information:</strong> Billing and subscription-related data is securely processed by our payment processor (e.g., Stripe); we do not store full credit card numbers on our servers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide, operate, and maintain the Service (generating quotes, managing jobs, processing invoices, organizing leads, and scheduling site visits).</li>
              <li>Authenticate you and secure your account.</li>
              <li>Send transactional communications, quote confirmations, and customer appointment notices.</li>
              <li>Enable user-requested integrations (e.g., sending quote proposals via your connected Gmail, syncing calendar appointments with Google Calendar).</li>
              <li>Comply with legal obligations, enforce our terms of service, and prevent fraud or security incidents.</li>
              <li>Analyze performance to improve product functionality and contractor workflows.</li>
            </ul>
          </section>

          {/* Dedicated Google API Services and Limited Use Disclosure Section */}
          <section className="rounded-xl border border-border/80 bg-muted/20 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              4. Google API Services User Data Policy &amp; Limited Use Disclosure
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              ContractorOps AI offers optional integrations with Google services (such as Gmail and Google Calendar) to streamline your client communication and project scheduling. When you connect your Google account, you grant ContractorOps AI permission to access certain Google user data through Google APIs via OAuth 2.0.
            </p>

            <h3 className="text-base font-semibold text-foreground pt-2">Types of Google Data Accessed:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 text-sm">
              <li><strong>Basic Profile:</strong> Your email address, name, and profile photo to identify your connected account.</li>
              <li><strong>Google Calendar:</strong> Reading calendar busy slots to prevent double-booking and creating or updating on-site estimate appointments.</li>
              <li><strong>Gmail:</strong> Sending quote estimates and project proposals on your behalf, and reading incoming client replies and inquiries directly related to your contractor business.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground pt-2">How Google User Data Is Used and Stored:</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Google OAuth tokens (access and refresh tokens) are encrypted and stored securely in our database. We access Google data strictly in response to your explicit actions within the platform (such as sending a quote or viewing client replies). We do not store unnecessary copies of your mailbox; message metadata is fetched on demand to display conversation history with your leads and clients.
            </p>

            <h3 className="text-base font-semibold text-foreground pt-2">Restrictions on Use of Google Data:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 text-sm">
              <li><strong>No Advertising:</strong> Google user data is NEVER used for serving advertisements, retargeting, or cross-context behavioral marketing.</li>
              <li><strong>No Sale:</strong> We NEVER sell, transfer, or license Google user data to any third party.</li>
              <li><strong>No AI Model Training:</strong> Google user data is NEVER used to train generalized artificial intelligence or machine learning models.</li>
              <li><strong>Limited Human Access:</strong> Humans do not read your email messages unless: (1) you provide explicit written consent for troubleshooting a specific technical issue; (2) it is required for security investigations (such as fraud or abuse); (3) it is required by applicable law; or (4) the data is aggregated and anonymized for internal operational metrics.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground pt-2">Revoking Access and Data Deletion:</h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              You can disconnect your Google account at any time directly in ContractorOps AI under <strong>Settings &rarr; Integrations &rarr; Disconnect</strong>. Disconnecting immediately revokes our access with Google and deletes all stored OAuth credentials and cached tokens from our systems. You can also revoke access at any time through your Google Security Settings at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:opacity-80"
              >
                https://myaccount.google.com/permissions
              </a>.
            </p>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-foreground leading-relaxed">
              <strong>Google Limited Use Compliance:</strong>
              <br />
              ContractorOps AI&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:opacity-80"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Third-Party Services and Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use trusted third-party service providers to support the Service, including cloud infrastructure, database hosting, payment processing (e.g., Stripe), and analytics. These providers process data only on our instructions and under confidentiality obligations. As stated above, Google user data is governed by strict Limited Use requirements and is never shared for advertising purposes. We may disclose information if required by law or in response to valid legal process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Retention and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide the Service, resolve disputes, and comply with legal obligations. We implement industry-standard administrative, physical, and technical safeguards (including TLS encryption in transit and AES encryption at rest for sensitive credentials) to protect your data against unauthorized access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Cookies and Similar Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies for authentication, session management, and site performance. You can manage or disable cookies through your browser settings, though some features of the Service may not function properly without essential cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your jurisdiction, you may have rights to access, review, correct, download, or delete your personal data, or to restrict or object to certain processing activities. You can update account information directly in your account settings or contact us to request data deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is designed for businesses and trade professionals and is not directed to individuals under the age of 16. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect product updates or legal requirements. When changes are made, we will update the &quot;Last updated&quot; date at the top of this page. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
            </p>
            <p className="mt-2 text-foreground">
              ContractorOps AI<br />
              The Green, Dover, DE 19901<br />
              Website: https://www.contractorops.ai<br />
              Email: support@contractorops.ai / siliconpeaksvc@gmail.com
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
