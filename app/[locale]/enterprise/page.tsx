import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import {
  ENTERPRISE_CONTACT_HREF,
  enterpriseOffer,
  enterprisePricing,
  enterpriseSegments,
  enterpriseStats,
  enterpriseSteps,
} from "@/components/enterprise"

export const metadata = {
  title: "Enterprise | ContractorOps",
  description:
    "ContractorOps for multi-location contractors, PE-backed platforms, and franchisors: answer and book more calls across every location, connected to the systems you already run.",
}

export default async function EnterprisePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-20 pt-32 text-white sm:px-8 lg:pt-36">
        <img src="/hero2.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.78),rgba(8,14,22,0.6)_50%,rgba(8,14,22,0.8))]" />
        <div className="mx-auto max-w-6xl">
          <div className="flex max-w-3xl flex-col items-start">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-white/62">ContractorOps Enterprise</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl">
              Answer and book more of the calls you already pay for, at every location.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
              Built for operators with 25 to 150 techs or crews, a central call center, and more than one system to keep in sync.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={ENTERPRISE_CONTACT_HREF}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90"
              >
                Talk to us about a pilot
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-full px-5 py-3 text-sm font-black text-white/85 ring-1 ring-white/25 transition-colors hover:bg-white/10"
              >
                How the pilot works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Where revenue leaks</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            Leads are expensive. Unanswered and unbooked calls waste them.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {enterpriseStats.map((stat) => (
              <div key={stat.value} className="rounded-2xl border border-[#eadfd7] bg-white/72 p-6 shadow-[0_18px_60px_rgba(96,75,64,0.08)]">
                <p className="text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{stat.label}</p>
                <a href={stat.url} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs font-semibold text-slate-400 hover:text-slate-700">
                  Source: {stat.source}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Who it is for</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Multi-location operators</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {enterpriseSegments.map((segment) => (
              <div key={segment.title} className="rounded-2xl bg-slate-950 p-6 text-white">
                <h3 className="text-lg font-black">{segment.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/68">{segment.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">What you get</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
            The core product, plus a custom layer scoped to your operation.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {enterpriseOffer.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#eadfd7] bg-white/72 p-6">
                <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 pb-16 sm:px-8 lg:pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">How it works</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Prove it at one brand, then roll out.</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {enterpriseSteps.map((step) => (
              <div key={step.step} className="rounded-2xl border border-[#eadfd7] bg-white/72 p-6">
                <p className="text-sm font-black text-slate-400">{step.step}</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-[#f1e7df] p-6 sm:p-8">
            <h3 className="text-xl font-black text-slate-950">How pricing works</h3>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {enterprisePricing.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Start with one brand.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
              Tell us about your locations, call volume, and the systems you run. We will scope a pilot around the numbers you care about.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={ENTERPRISE_CONTACT_HREF}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90"
            >
              Talk to us about a pilot
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href={`/${locale}/features`}
              className="inline-flex items-center rounded-full px-5 py-3 text-sm font-black text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10"
            >
              See all features
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
