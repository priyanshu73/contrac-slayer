"use client"

import { ReactNode, useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Download,
  MapPin,
  Navigation,
  PhoneCall,
  RefreshCw,
  Shield,
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
      initial={{ opacity: 0, y: 64, scale: 0.93 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
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
    <section className="scroll-mt-20 bg-[#fbf6f1] px-5 py-12 sm:px-8 lg:py-16">
      <div className={`mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
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
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: false, amount: 0.3 })
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (isInView && !hasEntered) {
      setHasEntered(true)
    }
  }, [isInView, hasEntered])

  const show = hasEntered

  return (
    <m.div
      ref={containerRef}
      className="w-full max-w-[600px] rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,#f2f8ff_0%,#eaf4ff_100%)] p-4 hover:ring-4 hover:ring-sky-500/15 hover:shadow-xl"
      initial={false}
      animate={show ? { x: 0, scale: 1, opacity: 1 } : { x: -120, scale: 0.87, opacity: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-[18px] border border-slate-200/80 bg-white/95 p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <Activity className="h-5 w-5 text-sky-600" />
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
          <span className="text-lg font-black text-sky-700">$3,212.50</span>
        </div>

        <button type="button" className="h-10 w-full rounded-lg bg-[#131820] text-sm font-semibold text-white transition-colors hover:bg-[#26313d]">
          Send to Client
        </button>
      </div>
    </m.div>
  )
}

function DispatchShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: false, amount: 0.3 })
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (isInView && !hasEntered) {
      setHasEntered(true)
    }
  }, [isInView, hasEntered])

  const show = hasEntered

  return (
    <m.div
      ref={containerRef}
      className="w-full max-w-[600px] rounded-[22px] border border-orange-100 bg-[linear-gradient(180deg,#fff5f0_0%,#ffeee5_100%)] p-4 hover:ring-4 hover:ring-orange-500/15 hover:shadow-xl"
      initial={false}
      animate={show ? { x: 0, scale: 1, opacity: 1 } : { x: -120, scale: 0.87, opacity: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="overflow-hidden rounded-[18px] border border-[#E8E3D6] bg-[#FFFFFF]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0EDE3] px-[20px] py-[16px]">
          <div className="flex items-center gap-2">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#FF7F50]/10">
              <Shield className="h-[14px] w-[14px]" stroke="#FF7F50" strokeWidth={2.5} />
            </div>
            <p className="text-[13px] font-semibold text-[#0A0A0A]">Subcontractor Dispatch</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#F1FAF5] px-2 py-1 text-[11px] font-semibold text-[#047857]">
            <span className="motion-safe-animate h-[5px] w-[5px] rounded-full bg-[#10B981]" style={{ animation: "subtle-pulse 2s infinite ease-in-out" }} />
            Autonomous
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Emergency Banner */}
          <div className="flex items-start gap-3 rounded-[10px] border-l-[3px] border-l-[#FF7F50] bg-[#FFF8F4] p-[14px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" stroke="#FF7F50" strokeWidth={2.5} />
            <div>
              <p className="text-[13px] font-semibold text-[#0A0A0A]">Emergency dispatch required</p>
              <p className="mt-1 text-[12px] text-[#5F5E5A]">
                Water heater burst &middot; 104 Main St &middot; within 10 mi
              </p>
            </div>
          </div>

          {/* Section Label */}
          <div className="mb-[10px] mt-[24px] flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[1.2px] text-[#888780]">DISPATCH QUEUE</span>
            <span className="text-[10px] font-medium text-[#888780]">2 candidates</span>
          </div>

          {/* Queue Items */}
          <div className="flex flex-col gap-[6px]">
            {/* Active Row */}
            <div
              className={`relative flex items-center justify-between overflow-hidden rounded-[10px] border border-[#FF7F50] bg-[#FFFFFF] px-[14px] py-[12px] transition-all duration-500 ${show ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
              style={{ transitionDelay: show ? "0ms" : "0ms" }}
            >
              {/* Shimmer sweep effect */}
              <div
                className="motion-safe-animate absolute inset-0 z-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,127,80,0.03) 50%, transparent 100%)",
                  width: "200%",
                  animation: "shimmer-sweep 3s infinite linear"
                }}
              />

              <div className="relative z-10 flex items-center gap-3">
                <div className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#FF7F50]/10">
                  {/* Animated pulsing ring */}
                  <div
                    className="motion-safe-animate absolute inset-0 rounded-full border border-[#FF7F50]"
                    style={{ animation: "avatar-ring-pulse 1.8s infinite cubic-bezier(0.4, 0, 0.6, 1)" }}
                  />
                  <span className="text-[12px] font-bold text-[#FF7F50]">DP</span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0A0A0A]">David&apos;s Plumbing Pro</p>
                  <p className="text-[12px] text-[#5F5E5A]">2.4 mi &middot; Priority 1</p>
                </div>
              </div>

              <div className="relative z-10 flex h-[26px] items-center gap-1.5 rounded-full bg-[#FF7F50] px-3">
                <div className="flex h-2.5 items-center gap-[2px]">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="motion-safe-animate w-[2px] rounded-full bg-white"
                      style={{
                        height: i === 1 ? "100%" : "60%",
                        animation: `soundwave-bounce 0.85s infinite ease-in-out ${i * 0.15}s`
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-white">Calling</span>
              </div>
            </div>

            {/* Standby Row */}
            <div
              className={`flex items-center justify-between rounded-[10px] border border-[#F0EDE3] bg-[#FAFAFA] px-[14px] py-[12px] transition-all duration-500 ${show ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"}`}
              style={{ transitionDelay: show ? "200ms" : "0ms" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F1EFE8]">
                  <span className="text-[12px] font-bold text-[#888780]">AW</span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#5F5E5A]">Apex Water Systems</p>
                  <p className="text-[12px] text-[#5F5E5A]">4.1 mi &middot; Priority 2</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#B4B2A9]">Standby</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-[16px] flex items-center gap-1.5 border-t border-[#F0EDE3] pt-[14px]">
            <RefreshCw className="h-[12px] w-[12px] text-[#888780]" />
            <span className="text-[11px] font-medium text-[#888780]">Auto-routes to next sub if no answer in 30s</span>
          </div>
        </div>
      </div>
    </m.div>
  )
}

function CostShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: false, amount: 0.3 })
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    if (isInView && !hasEntered) {
      setHasEntered(true)
    }
  }, [isInView, hasEntered])

  const show = hasEntered

  return (
    <m.div
      ref={containerRef}
      className="w-full max-w-[600px] rounded-[22px] border border-green-100 bg-[linear-gradient(180deg,#f4faf2_0%,#ebf5e6_100%)] p-4 hover:ring-4 hover:ring-green-500/15 hover:shadow-xl"
      initial={false}
      animate={show ? { x: 0, scale: 1, opacity: 1 } : { x: -120, scale: 0.87, opacity: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="rounded-[18px] border border-slate-200/80 bg-white/95 p-5 sm:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <DollarSign className="h-5 w-5 text-[#228B22]" />
          <p className="text-lg font-black text-slate-950">Smart Job Costing</p>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#228B22]/10 px-2.5 py-1 text-xs font-bold text-[#228B22]">
            <RefreshCw className="h-3 w-3" />
            Live Sync
          </span>
        </div>

        <div className="space-y-6 border-b border-slate-100 py-8 text-[15px] sm:text-base">
          {[
            ["Total Hard Costs", "$16,660.00"],
            ["Subcontractor Payouts", "$12,400.00"],
            ["Materials & Permits", "$4,260.00"],
            ["Target Margin (32%)", "$7,840.00"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-6">
              <span className="text-slate-950">{label}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-6 py-9">
          <span className="text-lg font-black text-slate-950">Total Contract Value</span>
          <span className="text-lg font-black text-[#228B22]">$24,500.00</span>
        </div>

        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#131820] text-sm font-semibold text-white transition-colors hover:bg-[#26313d]">
          <RefreshCw className="h-4 w-4" />
          Sync to QuickBooks
        </button>
      </div>
    </m.div>
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
