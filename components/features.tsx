"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Activity,
  CheckCircle2,
  DollarSign,
  Download,
  MapPin,
  Navigation,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react"
import { PhoneMessagePreview } from "@/components/phone-message-preview"

const m = motion as any

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  )
}

function FeatureSection({
  eyebrow,
  title,
  body,
  visual,
  reverse = false,
}: {
  eyebrow: string
  title: string
  body: string
  visual: ReactNode
  reverse?: boolean
}) {
  return (
    <section className="scroll-mt-20 bg-[#fbf6f1] px-5 py-20 sm:px-8 lg:py-28">
      <div className={`mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-24 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <Reveal className="flex justify-center">{visual}</Reveal>
        <Reveal className="mx-auto max-w-xl lg:mx-0">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600">{eyebrow}</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            {title}
          </h2>
          <p className="mt-6 text-xl leading-8 text-slate-600">{body}</p>
        </Reveal>
      </div>
    </section>
  )
}

function EstimateShowcase() {
  return (
    <div className="w-full max-w-[600px] rounded-[22px] border border-emerald-100 bg-[#eafbf6] p-4 shadow-[0_30px_90px_rgba(32,116,96,0.10)]">
      <div className="rounded-[18px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_44px_rgba(38,49,61,0.12)] sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <Activity className="h-5 w-5 text-[#5b50ff]" />
          <p className="text-lg font-black text-slate-950">AI Project Estimator</p>
        </div>

        <div className="space-y-6 border-b border-slate-100 py-8 text-[15px] sm:text-base">
          {[
            ["Materials Processing", "$1,250.00"],
            ["Labor Target (24h)", "$1,320.00"],
            ["Contractor Margin (25%)", "$642.50"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-6">
              <span className="text-slate-950">{label}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-6 py-9">
          <span className="text-lg font-black text-slate-950">Instant Quote Total</span>
          <span className="text-lg font-black text-[#5b50ff]">$3,212.50</span>
        </div>

        <button type="button" className="h-10 w-full rounded-lg bg-[#131820] text-sm font-semibold text-white transition-colors hover:bg-[#26313d]">
          Send to Client
        </button>
      </div>
    </div>
  )
}

function DispatchShowcase() {
  return (
    <div className="w-full max-w-[540px] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(71,44,164,0.14)]">
      <div className="flex h-10 items-center justify-between bg-[#6d2df6] px-4 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-100" />
          <p className="truncate text-sm font-black">Agentic Subcontractor Dispatch</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          Autonomous Mode
        </div>
      </div>

      <div className="bg-slate-50 p-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-sm font-black text-slate-900">Emergency Dispatch Required</p>
              <p className="mt-1 text-xs text-slate-500">Water heater burst at 104 Main St. Requires licensed plumber within 10 miles.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Navigation className="h-4 w-4" />
          AI Scanning Radius
        </div>

        <div className="mt-3 rounded-[18px] border-2 border-[#6258ff] bg-[#f5f7ff] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6258ff] shadow-sm">
                <User className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900">David&apos;s Plumbing Pro</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3" />
                  2.4 miles away - Priority 1
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-1 rounded-full bg-[#ebeaff] px-3 py-2 text-xs font-black text-[#4f46e5] sm:flex">
              <PhoneCall className="h-3.5 w-3.5" />
              Voice AI Calling
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
            <p className="flex items-center gap-1 text-xs font-black text-[#6258ff]">
              <Sparkles className="h-3.5 w-3.5" />
              Voice Agent Note
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              &quot;David, we have an emergency water heater leak 2 miles from you at 104 Main St. Can you dispatch immediately?&quot;
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 py-4 opacity-60">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-500">Apex Water Systems</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                4.1 miles away - Priority 2
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Standby</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        AI automatically routes to the next available crew.
      </div>
    </div>
  )
}

function CostShowcase() {
  return (
    <div className="w-full max-w-[540px] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(0,126,91,0.12)]">
      <div className="flex items-center justify-between bg-[#079b67] px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5" />
          <p className="text-sm font-black">Smart Job Costing</p>
        </div>
        <span className="flex items-center gap-2 rounded bg-[#058659] px-3 py-1 text-xs font-black">
          <RefreshCw className="h-3.5 w-3.5" />
          QB Synced
        </span>
      </div>

      <div className="bg-white p-4">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Total Contract Value</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">$24,500.00</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase text-slate-500">GC Profit Margin</p>
            <p className="mt-1 text-xl font-black text-[#079b67]">32% ($7,840)</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[1fr_92px_92px] bg-slate-50 px-3 py-3 text-xs font-black uppercase text-slate-500">
            <span>Line Item</span>
            <span className="text-right">GC Cost</span>
            <span className="text-right">Client $</span>
          </div>

          {[
            { item: "Rough Plumbing", sub: "David's Plumbing", cost: "$3,500", client: "$4,550", needsSub: false },
            { item: "Electrical Wiring", sub: "Unassigned", cost: "$2,800", client: "$3,640", needsSub: true },
            { item: "Drywall & Tape", sub: "JD Drywall", cost: "$1,500", client: "$2,100", needsSub: false },
          ].map(({ item, sub, cost, client, needsSub }) => (
            <div key={item} className="grid grid-cols-[1fr_92px_92px] border-t border-slate-100 px-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                  {needsSub ? null : <CheckCircle2 className="h-3 w-3 text-teal-500" />}
                  <span>{sub}</span>
                  {needsSub ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Needs Sub</span> : null}
                </div>
              </div>
              <span className="self-center text-right font-medium text-slate-600">{cost}</span>
              <span className="self-center text-right font-black text-slate-950">{client}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Download className="h-3.5 w-3.5" />
          Auto-generates Client PDF
        </span>
        <span className="h-4 w-px bg-slate-200" />
        <span className="text-[#079b67]">Syncs to QuickBooks</span>
      </div>
    </div>
  )
}

export function Features() {
  const t = useTranslations("landing")

  return (
    <div id="features" className="bg-[#fbf6f1]">
      <FeatureSection
        eyebrow={t("featureLeadEyebrow")}
        title={t("featuresCallsTitle")}
        body={t("featuresCallsBody")}
        visual={<PhoneMessagePreview className="w-[272px] sm:w-[296px] md:w-[320px]" />}
      />
      <FeatureSection
        eyebrow={t("featureEstimateEyebrow")}
        title={t("featureEstimateTitle")}
        body={t("featureEstimateBody")}
        visual={<EstimateShowcase />}
        reverse
      />
      <FeatureSection
        eyebrow={t("featureDispatchEyebrow")}
        title={t("featuresDispatchTitle")}
        body={t("featuresDispatchBody")}
        visual={<DispatchShowcase />}
      />
      <FeatureSection
        eyebrow={t("featureFinanceEyebrow")}
        title={t("featuresFinTitle")}
        body={t("featuresFinBody")}
        visual={<CostShowcase />}
        reverse
      />
    </div>
  )
}
