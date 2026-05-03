import Link from "next/link"
import { ArrowRight, Layers3 } from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { featureGroups } from "@/lib/feature-navigation"

export const metadata = {
  title: "Features | ContractorOps AI",
  description: "Explore ContractorOps AI features for job costing, AI scheduling, SMS, calls, calendar, subcontractors, contracts, and QuickBooks-ready workflows.",
}

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-20 pt-32 text-white sm:px-8 lg:pt-36">
        <img
          src="/hero2.webp"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.72),rgba(8,14,22,0.54)_50%,rgba(8,14,22,0.72))]" />

        <div className="mx-auto max-w-6xl">
          <div className="flex max-w-3xl flex-col items-start">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/14 text-white ring-1 ring-white/18 backdrop-blur-md">
              <Layers3 className="h-5 w-5" />
            </span>
            <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-white/62">Feature map</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl">
              Organized around the way contractor work actually moves.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
              Browse the platform by workflow: revenue control, customer conversations, field coordination, and agreements.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-2">
          {featureGroups.map((group) => (
            <section key={group.name} className="rounded-2xl border border-[#eadfd7] bg-white/72 p-5 shadow-[0_18px_60px_rgba(96,75,64,0.08)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{group.name}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{group.label}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{group.description}</p>

              <div className="mt-6 grid gap-2">
                {group.features.map((feature) => (
                  <Link
                    key={feature.slug}
                    href={`/${locale}/features/${feature.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-slate-950/[0.035]"
                  >
                    <span>
                      <span className="block text-sm font-black text-slate-950">{feature.shortTitle}</span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">{feature.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
