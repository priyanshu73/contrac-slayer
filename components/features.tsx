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
  Target,
  Zap,
  Mail,
  ArrowRight,
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
      <div className={`mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        {/* Visual — always on top on mobile (order-first), respects reverse only at lg */}
        <Reveal className={`flex justify-center ${reverse ? "lg:order-2" : ""}`}>{visual}</Reveal>
        {/* Text — always below visual on mobile */}
        <Reveal className={`mx-auto max-w-xl text-center lg:mx-0 lg:text-left ${reverse ? "lg:order-1" : ""}`}>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600">{eyebrow}</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl xl:text-6xl">
            {title}
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">{body}</p>
        </Reveal>
      </div>
    </section>
  )
}

function EstimateShowcase() {
  const t = useTranslations("landing")
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
          <p className="text-lg font-black text-slate-950">{t("step2NewProjectEstimate")}</p>
        </div>

        <div className="space-y-6 border-b border-slate-100 py-8 text-[15px] sm:text-base">
          {[
            [t("step2Materials"), "$1,250.00"],
            [t("step2Labor"), "$1,320.00"],
            [t("step2Margin"), "$642.50"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-6">
              <span className="text-slate-950">{label}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-6 py-9">
          <span className="text-lg font-black text-slate-950">{t("step2Total")}</span>
          <span className="text-lg font-black text-sky-700">$3,212.50</span>
        </div>

        <button type="button" className="h-10 w-full rounded-lg bg-[#131820] text-sm font-semibold text-white transition-colors hover:bg-[#26313d]">
          {t("step2Send")}
        </button>
      </div>
    </m.div>
  )
}

function DispatchShowcase() {
  const t = useTranslations("landing")
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
            <p className="text-[13px] font-semibold text-[#0A0A0A]">{t("featureDispatchCardTitle")}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#F1FAF5] px-2 py-1 text-[11px] font-semibold text-[#047857]">
            <span className="motion-safe-animate h-[5px] w-[5px] rounded-full bg-[#10B981]" style={{ animation: "subtle-pulse 2s infinite ease-in-out" }} />
            {t("showcaseDispatchAutonomous")}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Emergency Banner */}
          <div className="flex items-start gap-3 rounded-[10px] border-l-[3px] border-l-[#FF7F50] bg-[#FFF8F4] p-[14px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" stroke="#FF7F50" strokeWidth={2.5} />
            <div>
              <p className="text-[13px] font-semibold text-[#0A0A0A]">{t("showcaseDispatchEmergency")}</p>
              <p className="mt-1 text-[12px] text-[#5F5E5A]">
                {t("showcaseDispatchEmergencyDetail")}
              </p>
            </div>
          </div>

          {/* Section Label */}
          <div className="mb-[10px] mt-[24px] flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-[1.2px] text-[#888780]">{t("showcaseDispatchQueue")}</span>
            <span className="text-[10px] font-medium text-[#888780]">{t("showcaseDispatchCandidates")}</span>
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
                  <p className="text-[14px] font-semibold text-[#0A0A0A]">{t("featureDispatchCrew1")}</p>
                  <p className="text-[12px] text-[#5F5E5A]">{t("showcaseDispatchDistancePriority1")}</p>
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
                <span className="text-[11px] font-semibold text-white">{t("featureDispatchStatus1")}</span>
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
                  <p className="text-[14px] font-semibold text-[#5F5E5A]">{t("featureDispatchCrew2")}</p>
                  <p className="text-[12px] text-[#5F5E5A]">{t("showcaseDispatchDistancePriority2")}</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#B4B2A9]">{t("featureDispatchStatus2")}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-[16px] flex items-center gap-1.5 border-t border-[#F0EDE3] pt-[14px]">
            <RefreshCw className="h-[12px] w-[12px] text-[#888780]" />
            <span className="text-[11px] font-medium text-[#888780]">{t("showcaseDispatchAutoRoute")}</span>
          </div>
        </div>
      </div>
    </m.div>
  )
}

function LeadAgentShowcase() {
  const t = useTranslations("landing")
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
      className="relative w-full max-w-[480px] rounded-[22px] border border-green-100 bg-[linear-gradient(180deg,#f4faf2_0%,#ebf5e6_100%)] p-4 hover:ring-4 hover:ring-green-500/15 hover:shadow-xl mx-auto sm:mx-0"
      initial={false}
      animate={show ? { x: 0, scale: 1, opacity: 1 } : { x: -120, scale: 0.87, opacity: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: "easeOut" } }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-[18px] bg-white border border-slate-200/80 shadow-2xl shadow-black/[0.04]">
        
        {/* Map Section - Abstract Radius Visualization */}
        <div className="relative h-44 overflow-hidden bg-gradient-to-b from-[#00A86B]/5 to-white">
          
          {/* Radius Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative w-28 h-28">
              {/* Outer ring pulse */}
              <div className="absolute inset-0 rounded-full border-2 border-[#00A86B]/40 animate-ping" style={{ animationDuration: "2.5s" }} />
              {/* Main ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#00A86B]/30 bg-[#00A86B]/5" />
              {/* Inner ring */}
              <div className="absolute inset-4 rounded-full border border-dashed border-[#00A86B]/40" />
              {/* Center pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-[#00A86B] rounded-full flex items-center justify-center shadow-lg shadow-[#00A86B]/40">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Small floating pins */}
          <div className="absolute top-6 right-8">
            <div className="w-2 h-2 bg-[#00A86B] rounded-full shadow-sm" />
          </div>
          <div className="absolute top-12 left-10">
            <div className="w-1.5 h-1.5 bg-[#00A86B]/70 rounded-full" />
          </div>
          <div className="absolute bottom-12 right-16">
            <div className="w-1.5 h-1.5 bg-[#00A86B]/70 rounded-full" />
          </div>

          {/* Location Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8E3D6] shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-[#00A86B]" />
            <span className="text-xs font-semibold text-slate-900">{t("showcaseOutreachLocation")}</span>
            <span className="text-xs text-slate-500">{t("showcaseOutreachRadius")}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#231F20] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t("showcaseOutreachRadarTitle")}</h3>
                <p className="text-xs font-medium text-slate-500">{t("showcaseOutreachRadarSub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00A86B]/10 border border-[#00A86B]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00A86B] animate-pulse" />
              <span className="text-xs font-bold text-[#00A86B]">{t("showcaseOutreachAutopilot")}</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#F0EDE3]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
                <span className="text-xs font-medium text-slate-500">{t("showcaseOutreachLeadsFound")}</span>
              </div>
              <p className="text-xl font-black text-slate-900">142</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#F0EDE3]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Mail className="w-4 h-4 text-[#00A86B]" />
                <span className="text-xs font-medium text-slate-500">{t("showcaseOutreachDraftsReady")}</span>
              </div>
              <p className="text-xl font-black text-slate-900">142</p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#00A86B]/[0.03] border border-[#00A86B]/10 mb-5">
            <span className="text-xs font-semibold text-slate-700">{t("showcaseOutreachCampaignStatus")}</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-2.5 bg-[#00A86B] rounded-full animate-pulse" />
                <div className="w-0.5 h-2.5 bg-[#00A86B] rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                <div className="w-0.5 h-2.5 bg-[#00A86B] rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
              </div>
              <span className="text-xs font-bold text-[#00A86B]">{t("showcaseOutreachSending")}</span>
            </div>
          </div>

          {/* CTA */}
          <button type="button" className="group flex h-10 w-full items-center justify-center rounded-lg bg-[#231F20] text-sm font-semibold text-white transition-colors hover:bg-black">
            {t("showcaseOutreachViewLeads")}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute top-1 right-1 sm:-top-3 sm:-right-3 px-3 py-1.5 rounded-full bg-[#00A86B] text-white text-xs font-bold shadow-lg shadow-[#00A86B]/30">
        {t("showcaseOutreachNewBadge")}
      </div>
    </m.div>
  )
}

function CostShowcase() {
  const t = useTranslations("landing")
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
          <p className="text-lg font-black text-slate-950">{t("featuresFinTitle")}</p>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#228B22]/10 px-2.5 py-1 text-xs font-bold text-[#228B22]">
            <RefreshCw className="h-3 w-3" />
            {t("showcaseCostLiveSync")}
          </span>
        </div>

        <div className="space-y-6 border-b border-slate-100 py-8 text-[15px] sm:text-base">
          {[
            [t("showcaseCostHardCosts"), "$16,660.00"],
            [t("showcaseCostSubPayouts"), "$12,400.00"],
            [t("showcaseCostMaterialsPermits"), "$4,260.00"],
            [t("showcaseCostTargetMargin"), "$7,840.00"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-6">
              <span className="text-slate-950">{label}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-6 py-9">
          <span className="text-lg font-black text-slate-950">{t("showcaseCostContractTotal")}</span>
          <span className="text-lg font-black text-[#228B22]">$24,500.00</span>
        </div>

        <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#131820] text-sm font-semibold text-white transition-colors hover:bg-[#26313d]">
          <RefreshCw className="h-4 w-4" />
          {t("showcaseCostSyncQb")}
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
        eyebrow={t("featureOutreachEyebrow")}
        title={t("featureOutreachTitle")}
        body={t("featureOutreachBody")}
        visual={<LeadAgentShowcase />}
        reverse
      />
      <FeatureSection
        eyebrow={t("featureEstimateEyebrow")}
        title={t("featureEstimateTitle")}
        body={t("featureEstimateBody")}
        visual={<EstimateShowcase />}
      />
      <FeatureSection
        eyebrow={t("featureDispatchEyebrow")}
        title={t("featuresDispatchTitle")}
        body={t("featuresDispatchBody")}
        visual={<DispatchShowcase />}
        reverse
      />
      <FeatureSection
        eyebrow={t("featureFinanceEyebrow")}
        title={t("featuresFinTitle")}
        body={t("featuresFinBody")}
        visual={<CostShowcase />}
      />
    </div>
  )
}
