"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

export default function TermsPage() {
  const locale = useLocale()
  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/30"><div className="container mx-auto max-w-3xl px-4 py-4"><Button variant="ghost" size="sm" className="-ml-2 gap-2" asChild><Link href={`/${locale}`}><ArrowLeft className="h-4 w-4" />Back to home</Link></Button></div></div>
      <article className="container mx-auto max-w-3xl px-4 py-8 sm:py-10 md:py-14">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 19, 2026</p>
        <div className="prose prose-slate mt-8 max-w-none space-y-8 dark:prose-invert">
          <section><h2>1. Agreement</h2><p>These Terms govern your use of ContractorOps&apos; website, mobile applications, and related services. By creating an account or using the Service, you agree to these Terms and our <Link href={`/${locale}/privacy`}>Privacy Policy</Link>. If you use the Service for a business, you represent that you can accept these Terms for that business.</p></section>
          <section><h2>2. Your account and data</h2><p>You are responsible for protecting your credentials, providing accurate information, and ensuring that you have the rights and permissions needed to enter, upload, process, or communicate the customer, job, voice, photo, document, and other data you use with the Service. You are responsible for your users&apos; access to your workspace.</p></section>
          <section><h2>3. Communications and integrations</h2><p>You are responsible for obtaining required notices and consent before recording, transcribing, calling, texting, emailing, or otherwise communicating with a person through the Service. You must comply with applicable privacy, telemarketing, anti-spam, recording-consent, and consumer-protection laws. Optional third-party integrations are governed by their own terms and your authorization.</p></section>
          <section><h2>4. AI features</h2><p>AI-generated text, summaries, estimates, translations, images, and recommendations are provided as assistive tools. You must review them for accuracy, safety, rights clearance, and suitability before relying on, sending, publishing, or presenting them as work product. Generated imagery must not be represented as actual completed work.</p></section>
          <section><h2>5. Billing</h2><p>Paid features and subscriptions are billed through Stripe or another disclosed payment processor. Fees, billing cadence, cancellations, and refunds are presented at purchase or in the applicable billing flow. You remain responsible for applicable taxes and payment obligations until cancellation takes effect.</p></section>
          <section><h2>6. Acceptable use</h2><p>Do not use the Service unlawfully, to infringe rights, to send deceptive or unauthorized communications, to harm or exploit others, to interfere with the Service, or to attempt unauthorized access. We may suspend access needed to protect users, the Service, or legal compliance.</p></section>
          <section><h2>7. Availability and liability</h2><p>The Service is provided on an &quot;as available&quot; basis. To the extent permitted by law, ContractorOps disclaims implied warranties and is not liable for indirect, incidental, special, consequential, or punitive damages. Nothing in these Terms limits rights that cannot legally be limited.</p></section>
          <section><h2>8. Changes and contact</h2><p>We may change the Service or these Terms. Material changes will be posted here with an updated date. Questions: <a href="mailto:support@contractorops.ai">support@contractorops.ai</a>. You may delete your account from the <Link href={`/${locale}/delete-account`}>Delete account</Link> page.</p></section>
        </div>
      </article>
    </main>
  )
}
