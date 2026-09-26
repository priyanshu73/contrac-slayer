import Link from "next/link"
import { ArrowRight } from "lucide-react"

export const ENTERPRISE_CONTACT_HREF =
  "mailto:support@contractorops.ai?subject=ContractorOps%20enterprise%20pilot"

export const enterpriseStats = [
  {
    value: "27%",
    label: "of calls to home services businesses go unanswered.",
    source: "Invoca",
    url: "https://www.invoca.com/blog/how-much-missed-sales-calls-cost-home-services-businesses",
  },
  {
    value: "$372",
    label: "median cost per issued lead across the 2026 Qualified Remodeler Top 500.",
    source: "Qualified Remodeler",
    url: "https://www.qualifiedremodeler.com/the-2026-top-500-rankings-a-new-order-takes-shape/",
  },
  {
    value: "61% to 21%",
    label: "drop in call booking rate from the morning peak to after 6 p.m., even at large shops.",
    source: "ServiceTitan",
    url: "https://www.servicetitan.com/blog/data-call-booking-rates",
  },
  {
    value: "~$100K",
    label: "a year from a 5-point gain in booking rate for a single 5-14 tech shop.",
    source: "ServiceTitan",
    url: "https://www.servicetitan.com/blog/data-call-booking-rates",
  },
]

export const enterpriseSegments = [
  {
    title: "Remodeling and replacement companies",
    description:
      "Roofing, windows, siding, baths, and kitchens at scale, where every issued lead is expensive and a missed call is a lost appointment.",
  },
  {
    title: "PE-backed platforms",
    description:
      "Several acquired brands, each with its own phones, software, and habits. One layer to answer, book, and report across all of them.",
  },
  {
    title: "Franchisors",
    description:
      "A consistent intake and follow-up standard across locations, with the franchisor able to see how each one performs.",
  },
]

export const enterpriseOffer = [
  {
    title: "The core product, configured for you",
    description:
      "Call and text answering, scheduling, estimates, and follow-up set up around your locations, service areas, and booking rules.",
  },
  {
    title: "Connected to the systems you run",
    description:
      "Scoped integration work with your field service and CRM tools, so booked jobs land where your teams already work.",
  },
  {
    title: "Reporting across brands and locations",
    description:
      "Answer rates, booking rates, and booked jobs by location and brand, compared against the baseline from before the pilot.",
  },
  {
    title: "Your estimate and follow-up workflows",
    description:
      "Custom follow-up sequences and estimate steps that match how your sales team closes, built as a scoped paid project.",
  },
]

export const enterpriseSteps = [
  {
    step: "01",
    title: "Paid pilot at one brand",
    description:
      "60 to 90 days at one brand or location group. We agree on the baseline and the numbers that count as success before we start.",
  },
  {
    step: "02",
    title: "Measure against the baseline",
    description:
      "Answer rate, booking rate, and booked jobs, reported the same way your ops team already reads them.",
  },
  {
    step: "03",
    title: "Roll out to sister brands",
    description:
      "Once the numbers hold at one brand, the same setup extends to the rest of your locations and brands.",
  },
]

export const enterprisePricing = [
  { title: "Per-location fee", description: "A predictable monthly fee for each location on the platform." },
  { title: "Usage and booked-job fee", description: "Tied to the work that actually comes through, so cost follows results." },
  { title: "Implementation fee", description: "A one-time, scoped fee for integrations and custom workflows." },
]

export function Enterprise({ locale }: { locale: string }) {
  return (
    <section id="enterprise" className="px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-slate-950 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">For multi-location operators</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              Running several locations, brands, or a call center?
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
              ContractorOps Enterprise is set up around your locations and connected to the systems you already use. It starts with a paid pilot at one brand and expands once the numbers hold.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {enterpriseStats.slice(0, 2).map((stat) => (
              <div key={stat.value} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <p className="mt-2 text-sm leading-5 text-white/65">{stat.label}</p>
                <a href={stat.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-white/40 hover:text-white/70">
                  Source: {stat.source}
                </a>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/enterprise`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition-colors hover:bg-white/90"
          >
            See ContractorOps Enterprise
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={ENTERPRISE_CONTACT_HREF}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10"
          >
            Talk to us about a pilot
          </a>
        </div>
      </div>
    </section>
  )
}
