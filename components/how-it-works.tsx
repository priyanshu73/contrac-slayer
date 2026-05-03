"use client"

import { useTranslations } from "next-intl"
import { ArrowRight, CalendarCheck, FileText, PhoneIncoming, Wrench } from "lucide-react"

export function HowItWorks() {
  const t = useTranslations("landing")

  const steps = [
    {
      icon: PhoneIncoming,
      label: t("workflowStep1Label"),
      title: t("workflowStep1Title"),
      body: t("workflowStep1Body"),
    },
    {
      icon: FileText,
      label: t("workflowStep2Label"),
      title: t("workflowStep2Title"),
      body: t("workflowStep2Body"),
    },
    {
      icon: Wrench,
      label: t("workflowStep3Label"),
      title: t("workflowStep3Title"),
      body: t("workflowStep3Body"),
    },
  ]

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">{t("workflowKicker")}</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {t("howItWorksTitle")}
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">{t("howItWorksSubtitle")}</p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {steps.map(({ icon: Icon, label, title, body }, index) => (
            <article key={title} className="relative rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {index < steps.length - 1 && (
                <div className="absolute right-[-22px] top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm lg:flex">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-black text-slate-300">0{index + 1}</span>
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-sky-600">{label}</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CalendarCheck className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-950">{t("workflowBottomTitle")}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("workflowBottomBody")}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[t("workflowBottomChip1"), t("workflowBottomChip2"), t("workflowBottomChip3")].map((chip) => (
              <span key={chip} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
