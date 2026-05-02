import type { ComponentType } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSignature,
  MessageSquareText,
  Mic2,
  PhoneCall,
  ReceiptText,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { Header } from "@/components/header"
import { LandingFooter } from "@/components/landing-footer"
import { featureGroups, features, getFeature, type FeatureIcon } from "@/lib/feature-navigation"

const featureIcons: Record<FeatureIcon, ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  phone: PhoneCall,
  calendar: CalendarDays,
  briefcase: BriefcaseBusiness,
  message: MessageSquareText,
  signature: FileSignature,
  users: UsersRound,
  clock: Clock3,
  sms: Sparkles,
  mic: Mic2,
  summary: ReceiptText,
  quickbooks: RefreshCw,
}

export function generateStaticParams() {
  return ["en", "es"].flatMap((locale) =>
    features.map((feature) => ({
      locale,
      feature: feature.slug,
    })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ feature: string }>
}): Promise<Metadata> {
  const { feature: slug } = await params
  const feature = getFeature(slug)

  if (!feature) {
    return {
      title: "Feature | ContractorOps AI",
    }
  }

  return {
    title: `${feature.title} | ContractorOps AI`,
    description: feature.description,
  }
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ locale: string; feature: string }>
}) {
  const { locale, feature: slug } = await params
  const feature = getFeature(slug)

  if (!feature) {
    notFound()
  }

  const Icon = featureIcons[feature.icon]
  const group = featureGroups.find((candidate) => candidate.name === feature.groupName)
  const relatedFeatures = group?.features.filter((candidate) => candidate.slug !== feature.slug) ?? []

  return (
    <main className="min-h-screen bg-[#fbf6f1] text-slate-950">
      <Header />

      <section className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-16 pt-32 text-white sm:px-8 lg:pb-20 lg:pt-36">
        <img
          src="/hero2.webp"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.74),rgba(8,14,22,0.52)_48%,rgba(8,14,22,0.74))]" />

        <div className="mx-auto max-w-6xl">
          <Link
            href={`/${locale}/features`}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All features
          </Link>

          <div className="mt-10 max-w-3xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/14 text-white ring-1 ring-white/18 backdrop-blur-md">
              <Icon className="h-6 w-6" />
            </span>
            <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-white/62">{feature.groupName}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl">
              {feature.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">{feature.hero}</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">How it helps</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {feature.description}
            </h2>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{feature.body}</p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {feature.outcomes.map((outcome) => (
                <div key={outcome} className="rounded-2xl border border-[#eadfd7] bg-white/72 p-4 shadow-[0_16px_44px_rgba(96,75,64,0.06)]">
                  <CheckCircle2 className="h-5 w-5 text-sky-600" />
                  <p className="mt-4 text-sm font-black leading-6 text-slate-900">{outcome}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-[#eadfd7] bg-white/78 p-5 shadow-[0_18px_60px_rgba(96,75,64,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{feature.groupName}</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">{feature.groupLabel}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{group?.description}</p>

            <div className="mt-6 grid gap-2">
              {relatedFeatures.length > 0 ? (
                relatedFeatures.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/${locale}/features/${related.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-950/[0.035]"
                  >
                    {related.shortTitle}
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  </Link>
                ))
              ) : (
                <Link
                  href={`/${locale}/features`}
                  className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-950/[0.035]"
                >
                  View feature map
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      <LandingFooter />
    </main>
  )
}
