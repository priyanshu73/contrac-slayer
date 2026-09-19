"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

export default function PrivacyPolicyPage() {
  const locale = useLocale()

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <Button variant="ghost" size="sm" className="-ml-2 gap-2" asChild>
            <Link href={`/${locale}`}><ArrowLeft className="h-4 w-4" />Back to home</Link>
          </Button>
        </div>
      </div>
      <article className="container mx-auto max-w-3xl px-4 py-8 sm:py-10 md:py-14">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 19, 2026</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-8 dark:prose-invert">
          <section>
            <h2>1. Scope and contact</h2>
            <p>ContractorOps (&quot;we,&quot; &quot;us,&quot; and &quot;our&quot;) provides contractor business-management software through our website, mobile applications, and related services (collectively, the &quot;Service&quot;). This policy explains how we handle information when you use the Service.</p>
            <p>Privacy questions or requests: <a href="mailto:privacy@contractorops.ai">privacy@contractorops.ai</a>. Product support: <a href="mailto:support@contractorops.ai">support@contractorops.ai</a>.</p>
          </section>

          <section>
            <h2>2. Information we collect</h2>
            <ul>
              <li><strong>Account and business profile data:</strong> name, email address, password (stored as a password hash), company name, business contact information, logo, service area, settings, team-member details, and subscription status.</li>
              <li><strong>Customer, lead, and work data:</strong> client names, contact details, addresses, notes, lead details, project and job details, quotes, invoices, payment schedules, appointments, signatures, and communications you enter or receive through the Service.</li>
              <li><strong>Photos, documents, and other uploads:</strong> file names, file content, metadata, and the records that associate uploads with a lead, client, job, project, quote, invoice, or support ticket.</li>
              <li><strong>Voice and communications data:</strong> voice notes you choose to record, their transcripts, summaries, action items, call and SMS-related records, and email messages or metadata used to provide the communications features you enable.</li>
              <li><strong>Location data:</strong> when you grant the mobile app foreground location permission, the app may collect your approximate or precise current location only while you use the location-based lead/campaign feature to help fill a city, state, or ZIP code. We do not request background location access.</li>
              <li><strong>Connected-account data:</strong> if you connect Google, Gmail, Google Calendar, or QuickBooks, the data and access tokens needed to provide the specific connection you authorize, such as email sending/replies, calendar availability and events, or accounting synchronization.</li>
              <li><strong>Technical and usage data:</strong> device/browser information, IP address, authentication and security logs, app interactions, diagnostics, and essential cookies. Our public website also uses Google Analytics and TikTok Pixel on production web pages.</li>
              <li><strong>Billing data:</strong> subscription, customer, and transaction identifiers from Stripe. Card details are handled by Stripe, not stored by ContractorOps.</li>
            </ul>
          </section>

          <section>
            <h2>3. How we use information</h2>
            <p>We use information to authenticate users; operate the CRM, quoting, invoicing, scheduling, project, team, and communication features; store and retrieve uploads; provide requested location-assisted search; process subscriptions; provide support; secure and improve the Service; and meet legal obligations.</p>
            <p>When you use an AI feature, we use the content you submit to generate the requested output. For example, text, photos, documents, voice transcripts, or job context may be sent to an AI service to create a draft, summary, estimate, translation, or generated image. AI output may be inaccurate and requires your review before use or sharing.</p>
          </section>

          <section>
            <h2>4. Service providers and sharing</h2>
            <p>We disclose information to providers that process it to operate the Service, under their applicable terms and privacy practices. Depending on the feature you use, these include:</p>
            <ul>
              <li>cloud infrastructure, database, and file-storage providers, including DigitalOcean, Amazon Web Services S3, and Cloudinary;</li>
              <li>OpenAI and the configured transcription provider for AI, transcription, summaries, embeddings, translation, and related requested AI features;</li>
              <li>FAL for requested AI image-generation or image-editing features;</li>
              <li>Google for an optional Google, Gmail, or Google Calendar connection;</li>
              <li>Intuit QuickBooks for an optional accounting connection;</li>
              <li>Twilio and related telephony providers for numbers, calls, and SMS features you enable;</li>
              <li>Stripe for subscriptions and payments; Mapbox for address and location search; and diagnostic, analytics, and marketing providers such as Google Analytics and TikTok for the website.</li>
            </ul>
            <p>We also disclose information when you direct us to do so (for example, sending a quote or message to a client), to comply with law, or to protect the Service, users, and the public.</p>
          </section>

          <section className="rounded-xl border border-border bg-muted/20 p-5">
            <h2>5. Google API Services and Limited Use</h2>
            <p>Google integrations are optional. With your authorization, ContractorOps may access basic profile information, Gmail data needed to send business messages and display relevant replies, and Google Calendar availability or events needed for scheduling.</p>
            <p>We use Google user data only to provide or improve the user-facing features you request. We do not use Google user data for advertising, sell it, or use it to train generalized AI or machine-learning models. Human access is limited to your consent, a requested support issue, security or abuse investigation, legal compliance, or aggregated/de-identified operational reporting.</p>
            <p>You can disconnect Google in Settings → Integrations, which revokes the connection and removes stored OAuth credentials, or revoke access at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">Google Account permissions</a>. ContractorOps&apos; use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>
          </section>

          <section>
            <h2>6. Your choices and account deletion</h2>
            <p>You can update business-profile information, disconnect optional integrations, manage browser cookies, and control mobile permissions in your device settings. You can permanently delete your ContractorOps account and associated workspace data from the mobile app at Settings → Account → Delete account, or from our public <Link href={`/${locale}/delete-account`}>Delete account</Link> page without reinstalling the app.</p>
            <p>Deletion removes the ContractorOps account and associated workspace records, including uploaded files tracked by the Service. We may retain only information that we must keep for legal obligations, dispute resolution, fraud/security prevention, or billing records held by a payment processor. A third-party provider may retain information according to its own legal obligations and retention policy.</p>
          </section>

          <section>
            <h2>7. Retention and security</h2>
            <p>We retain Service data while an account is active and for the period needed to provide the Service. We delete account and associated workspace data when a deletion request is completed, subject to the limited retention described above. We use administrative, technical, and organizational measures intended to protect information, including encryption in transit and access controls. No system is completely secure.</p>
          </section>

          <section>
            <h2>8. Children</h2>
            <p>The Service is intended for business and trade professionals and is not directed to children. Do not use the Service if you are under the age required to consent to online services where you live.</p>
          </section>

          <section>
            <h2>9. Changes</h2>
            <p>We may update this policy when the Service or applicable requirements change. We will post the updated version here and revise the date above.</p>
          </section>
        </div>
      </article>
    </main>
  )
}
