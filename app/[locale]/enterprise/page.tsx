import { ArrowRight, BarChart3, FileText, PhoneCall, Plug } from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { EnterprisePilotForm } from "@/components/enterprise-pilot-form"
import { ENTERPRISE_CONTACT_HREF, enterpriseStats } from "@/components/enterprise"

export const metadata = {
  title: "Enterprise | ContractorOps",
  description:
    "ContractorOps for multi-location contractors, PE-backed platforms, and franchisors: answer and book more calls across every location, connected to the systems you already run.",
}

const capabilities = [
  {
    icon: PhoneCall,
    tint: "bg-orange-50 text-orange-600",
    title: "Every call, every location",
    text: "Calls and texts answered and booked by each location's rules.",
  },
  {
    icon: Plug,
    tint: "bg-sky-50 text-sky-600",
    title: "Fits your stack",
    text: "Booked jobs land in the field service and CRM tools you already run.",
  },
  {
    icon: BarChart3,
    tint: "bg-emerald-50 text-emerald-600",
    title: "Reporting by brand",
    text: "Answer rate, booking rate, and booked jobs per location, against your baseline.",
  },
  {
    icon: FileText,
    tint: "bg-slate-100 text-slate-600",
    title: "Your sales workflows",
    text: "Estimate and follow-up steps built around how your team closes.",
  },
]

const steps = [
  { title: "Paid pilot at one brand", text: "60-90 days, baseline agreed up front" },
  { title: "Measure", text: "Answer rate, booking rate, booked jobs" },
  { title: "Roll out", text: "Per-location pricing" },
]

const [unanswered, costPerLead, bookingDrop] = enterpriseStats

function Donut({ percent }: { percent: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#eadfd7" strokeWidth="8" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="#ea580c"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * c} ${c}`}
      />
    </svg>
  )
}

function Source({ stat }: { stat: { source: string; url: string } }) {
  return (
    <a
      href={stat.url}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-block text-xs font-semibold text-slate-400 hover:text-slate-700"
    >
      {stat.source}
    </a>
  )
}

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-16 pt-32 text-white sm:px-8 lg:pb-20 lg:pt-36">
        <img src="/hero2.webp" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.8),rgba(8,14,22,0.62)_50%,rgba(8,14,22,0.82))]" />
        <div className="mx-auto max-w-6xl">
          <span className="inline-block rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/80 ring-1 ring-white/20">
            For multi-location operators
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            One front office for every branch, brand, and territory.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/75">
            For operators with 25-150 techs or crews and a central call center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#pilot"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90"
            >
              Talk to us about a pilot
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, tint, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-[#eadfd7] bg-white p-6 shadow-[0_18px_60px_rgba(96,75,64,0.08)]"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-lg font-black">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#eadfd7] bg-white p-5 shadow-[0_18px_60px_rgba(96,75,64,0.08)]">
              <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-2">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex flex-1 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black leading-5">{step.title}</span>
                      <span className="block text-xs leading-5 text-slate-500">{step.text}</span>
                    </span>
                    {i < steps.length - 1 && (
                      <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div id="pilot" className="scroll-mt-28">
            <EnterprisePilotForm />
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="mx-auto max-w-6xl border-t border-[#eadfd7] pt-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-4">
                <Donut percent={27} />
                <p className="text-5xl font-black tracking-tight">{unanswered.value}</p>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">of calls to home services businesses go unanswered</p>
              <Source stat={unanswered} />
            </div>

            <div>
              <div className="flex h-16 items-center">
                <p className="text-5xl font-black tracking-tight">{costPerLead.value}</p>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">median cost per issued lead, 2026 Top 500 remodelers</p>
              <Source stat={costPerLead} />
            </div>

            <div>
              <div className="flex h-16 items-end gap-4">
                <div className="flex h-full items-end gap-2" aria-hidden="true">
                  <div className="w-5 rounded-t bg-slate-950" style={{ height: "61%" }} />
                  <div className="w-5 rounded-t bg-orange-500" style={{ height: "21%" }} />
                </div>
                <p className="text-5xl font-black tracking-tight">61%→21%</p>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">call booking rate, morning peak vs. after 6 p.m.</p>
              <Source stat={bookingDrop} />
            </div>
          </div>
          <p className="mt-12 text-center text-sm text-slate-500">
            Questions first?{" "}
            <a href={ENTERPRISE_CONTACT_HREF} className="font-bold text-slate-950 underline underline-offset-4">
              Email us
            </a>
          </p>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
