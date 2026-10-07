"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2 } from "lucide-react"

import {
  DISCOVERY_ASSETS,
  DISCOVERY_CALL_URL,
  DISCOVERY_FEATURES,
  DISCOVERY_STEP_FIELDS,
  DISCOVERY_TRADES,
  discoveryQuestionnaireSchema,
  type DiscoveryQuestionnaire,
} from "@/lib/discovery-questionnaire"

const TEAM_SIZES = ["solo", "2_5", "6_15", "16_plus"] as const
const REVENUE_RANGES = ["under_100k", "100k_500k", "500k_1m", "over_1m"] as const
const ESTIMATE_METHODS = ["paper", "documents", "software"] as const
const INTEREST_OPTIONS = ["yes", "maybe", "no"] as const

const initialValues: DiscoveryQuestionnaire = {
  business_name: "",
  business_type: [],
  business_type_other: "",
  team_size: "",
  service_areas: "",
  annual_revenue: "",
  existing_assets: [],
  estimate_method: "",
  current_software: "",
  desired_features: [],
  ai_receptionist_interest: "",
  commercial_leads_interest: "",
  contact_name: "",
  email: "",
  phone: "",
}

export function DiscoveryQuestionnairePage() {
  const locale = useLocale()
  const t = useTranslations("discovery")
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const form = useForm<DiscoveryQuestionnaire>({
    resolver: zodResolver(discoveryQuestionnaireSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  })
  const values = form.watch()
  const errors = form.formState.errors

  async function continueToNextStep() {
    const valid = await form.trigger(DISCOVERY_STEP_FIELDS[step], { shouldFocus: true })
    if (!valid) return
    if (step === DISCOVERY_STEP_FIELDS.length - 1) {
      setReady(true)
    } else {
      setStep((current) => current + 1)
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleTrade(value: DiscoveryQuestionnaire["business_type"][number]) {
    const current = form.getValues("business_type")
    form.setValue("business_type", current.includes(value) ? current.filter((item) => item !== value) : [...current, value], { shouldValidate: true })
  }

  function toggleAsset(value: DiscoveryQuestionnaire["existing_assets"][number]) {
    const current = form.getValues("existing_assets")
    form.setValue("existing_assets", current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  function toggleFeature(value: DiscoveryQuestionnaire["desired_features"][number]) {
    const current = form.getValues("desired_features")
    form.setValue("desired_features", current.includes(value) ? current.filter((item) => item !== value) : [...current, value], { shouldValidate: true })
  }

  const optionClass = (selected: boolean) =>
    `flex min-h-13 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b67] ${
      selected
        ? "border-[#176b67] bg-[#ecf6f1] text-[#154c43]"
        : "border-[#e6e5de] bg-white text-[#34423d] hover:border-[#aec9ba] hover:bg-[#fafcf8]"
    }`

  const fieldClass = "mt-2 h-12 w-full rounded-xl border border-[#dcded6] bg-white px-4 text-base text-[#172b25] outline-none transition-colors placeholder:text-[#87918a] focus:border-[#176b67] focus:ring-2 focus:ring-[#176b67]/15"
  const questionClass = "mb-3 block text-[15px] font-semibold text-[#263b32]"

  return (
    <main className="min-h-screen bg-[#f7f6f1] px-4 pb-14 text-[#263b32] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <Link href={`/${locale}`} className="flex items-center gap-2.5 font-semibold tracking-tight text-[#173a34]" aria-label="ContractorOps">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full" />
            </span>
            <span>ContractorOps</span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-[#e2e4da] bg-white p-1 text-xs font-semibold" aria-label={t("languageLabel")}>
            <Link href="/en/discover" aria-current={locale === "en" ? "page" : undefined} className={`rounded-full px-3 py-2 ${locale === "en" ? "bg-[#e6f1eb] text-[#145a50]" : "text-[#58675e] hover:bg-[#f6f7f1]"}`}>🇺🇸 EN</Link>
            <Link href="/es/discover" aria-current={locale === "es" ? "page" : undefined} className={`rounded-full px-3 py-2 ${locale === "es" ? "bg-[#e6f1eb] text-[#145a50]" : "text-[#58675e] hover:bg-[#f6f7f1]"}`}>🇲🇽 ES</Link>
          </nav>
        </header>

        <div className="mb-7 text-center sm:mb-9">
          <span className="inline-flex rounded-full border border-[#dce7d9] bg-[#eef6e9] px-3 py-1.5 text-xs font-semibold text-[#285a46]">{t("eyebrow")}</span>
          <h1 className="mx-auto mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#183c33] sm:text-4xl">{t("title")}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#667269] sm:text-base">{t("intro")}</p>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-[#e5e4da] bg-[#fffefa] shadow-[0_20px_60px_-38px_rgba(29,54,38,0.35)]">
          {ready ? (
            <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#e8f4ed] text-[#176b67]"><CheckCircle2 className="size-8" /></span>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#183c33] sm:text-3xl">{t("readyTitle")}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#667269]">{t("readyBody")}</p>
              <p className="mx-auto mt-4 max-w-md rounded-xl bg-[#fff4df] px-4 py-3 text-xs leading-5 text-[#71552a]">{t("previewNotice")}</p>
              <a href={DISCOVERY_CALL_URL} target="_blank" rel="noopener noreferrer" className="mx-auto mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176b67] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#105954] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b67] focus-visible:ring-offset-2">
                <CalendarDays className="size-4" /> {t("bookCall")}
              </a>
              <button type="button" onClick={() => { setReady(false); setStep(3) }} className="mt-5 block w-full text-sm font-medium text-[#426f60] underline underline-offset-4">{t("editAnswers")}</button>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void continueToNextStep() }} noValidate>
              <div className="border-b border-[#ebeae3] px-6 pb-5 pt-7 sm:px-10 sm:pt-9">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#61806c]">
                  <span>{t("stepCount", { current: step + 1, total: 4 })}</span>
                  <span>{t(`steps.${step}.short`)}</span>
                </div>
                <div className="mt-4 flex gap-2" aria-hidden="true">
                  {DISCOVERY_STEP_FIELDS.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#176b67]" : "bg-[#e6e9df]"}`} />)}
                </div>
                <h2 className="mt-6 text-2xl font-semibold tracking-tight text-[#183c33]">{t(`steps.${step}.title`)}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#718076]">{t(`steps.${step}.description`)}</p>
              </div>

              <div className="space-y-7 px-6 py-7 sm:px-10 sm:py-9">
                {step === 0 && <>
                  <div>
                    <label htmlFor="business_name" className={questionClass}>{t("businessName")}</label>
                    <input id="business_name" autoComplete="organization" className={fieldClass} placeholder={t("businessNamePlaceholder")} aria-invalid={!!errors.business_name} {...form.register("business_name")} />
                    {errors.business_name && <p className="mt-2 text-xs text-red-700">{t("required")}</p>}
                  </div>
                  <fieldset>
                    <legend className={questionClass}>{t("businessType")}</legend>
                    <p className="mb-3 text-xs text-[#718076]">{t("selectAll")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DISCOVERY_TRADES.map((trade) => <button key={trade} type="button" aria-pressed={values.business_type.includes(trade)} onClick={() => toggleTrade(trade)} className={optionClass(values.business_type.includes(trade))}>{t(`trades.${trade}`)}{values.business_type.includes(trade) && <Check className="size-4 shrink-0" />}</button>)}
                    </div>
                    {values.business_type.includes("other") && <input aria-label={t("otherTrade")} className={fieldClass} placeholder={t("otherTrade")} {...form.register("business_type_other")} />}
                    {errors.business_type && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                  </fieldset>
                  <fieldset>
                    <legend className={questionClass}>{t("teamSize")}</legend>
                    <div className="grid grid-cols-2 gap-2">{TEAM_SIZES.map((size) => <button key={size} type="button" aria-pressed={values.team_size === size} onClick={() => form.setValue("team_size", size)} className={optionClass(values.team_size === size)}>{t(`team.${size}`)}{values.team_size === size && <Check className="size-4 shrink-0" />}</button>)}</div>
                    {errors.team_size && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                  </fieldset>
                  <div>
                    <label htmlFor="service_areas" className={questionClass}>{t("serviceAreas")}</label>
                    <input id="service_areas" className={fieldClass} placeholder={t("serviceAreasPlaceholder")} aria-invalid={!!errors.service_areas} {...form.register("service_areas")} />
                    {errors.service_areas && <p className="mt-2 text-xs text-red-700">{t("required")}</p>}
                  </div>
                  <fieldset>
                    <legend className={questionClass}>{t("annualRevenue")}</legend>
                    <p className="mb-3 text-xs text-[#718076]">{t("optional")}</p>
                    <div className="grid grid-cols-2 gap-2">{REVENUE_RANGES.map((range) => <button key={range} type="button" aria-pressed={values.annual_revenue === range} onClick={() => form.setValue("annual_revenue", values.annual_revenue === range ? "" : range)} className={optionClass(values.annual_revenue === range)}>{t(`revenue.${range}`)}{values.annual_revenue === range && <Check className="size-4 shrink-0" />}</button>)}</div>
                  </fieldset>
                </>}

                {step === 1 && <>
                  <fieldset>
                    <legend className={questionClass}>{t("existingAssets")}</legend>
                    <p className="mb-3 text-xs text-[#718076]">{t("selectAllOptional")}</p>
                    <div className="grid gap-2 sm:grid-cols-2">{DISCOVERY_ASSETS.map((asset) => <button key={asset} type="button" aria-pressed={values.existing_assets.includes(asset)} onClick={() => toggleAsset(asset)} className={optionClass(values.existing_assets.includes(asset))}>{t(`assets.${asset}`)}{values.existing_assets.includes(asset) && <Check className="size-4 shrink-0" />}</button>)}</div>
                  </fieldset>
                  <fieldset>
                    <legend className={questionClass}>{t("estimateMethod")}</legend>
                    <div className="grid gap-2">{ESTIMATE_METHODS.map((method) => <button key={method} type="button" aria-pressed={values.estimate_method === method} onClick={() => form.setValue("estimate_method", method)} className={optionClass(values.estimate_method === method)}>{t(`estimate.${method}`)}{values.estimate_method === method && <Check className="size-4 shrink-0" />}</button>)}</div>
                    {errors.estimate_method && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                    {values.estimate_method === "software" && <input aria-label={t("softwareName")} className={fieldClass} placeholder={t("softwareName")} {...form.register("current_software")} />}
                  </fieldset>
                </>}

                {step === 2 && <>
                  <fieldset>
                    <legend className={questionClass}>{t("desiredFeatures")}</legend>
                    <p className="mb-3 text-xs text-[#718076]">{t("selectAll")}</p>
                    <div className="grid gap-2 sm:grid-cols-2">{DISCOVERY_FEATURES.map((feature) => <button key={feature} type="button" aria-pressed={values.desired_features.includes(feature)} onClick={() => toggleFeature(feature)} className={optionClass(values.desired_features.includes(feature))}>{t(`features.${feature}`)}{values.desired_features.includes(feature) && <Check className="size-4 shrink-0" />}</button>)}</div>
                    {errors.desired_features && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                  </fieldset>
                  <fieldset>
                    <legend className={questionClass}>{t("receptionist")}</legend>
                    <p className="mb-3 text-xs leading-5 text-[#718076]">{t("receptionistHint")}</p>
                    <div className="grid gap-2">{INTEREST_OPTIONS.map((interest) => <button key={interest} type="button" aria-pressed={values.ai_receptionist_interest === interest} onClick={() => form.setValue("ai_receptionist_interest", interest)} className={optionClass(values.ai_receptionist_interest === interest)}>{t(`interest.receptionist.${interest}`)}{values.ai_receptionist_interest === interest && <Check className="size-4 shrink-0" />}</button>)}</div>
                    {errors.ai_receptionist_interest && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                  </fieldset>
                  <fieldset>
                    <legend className={questionClass}>{t("commercialLeads")}</legend>
                    <p className="mb-3 text-xs leading-5 text-[#718076]">{t("commercialLeadsHint")}</p>
                    <div className="grid gap-2">{INTEREST_OPTIONS.map((interest) => <button key={interest} type="button" aria-pressed={values.commercial_leads_interest === interest} onClick={() => form.setValue("commercial_leads_interest", interest)} className={optionClass(values.commercial_leads_interest === interest)}>{t(`interest.leads.${interest}`)}{values.commercial_leads_interest === interest && <Check className="size-4 shrink-0" />}</button>)}</div>
                    {errors.commercial_leads_interest && <p className="mt-2 text-xs text-red-700">{t("chooseOne")}</p>}
                  </fieldset>
                </>}

                {step === 3 && <>
                  <div><label htmlFor="contact_name" className={questionClass}>{t("contactName")}</label><input id="contact_name" autoComplete="name" className={fieldClass} placeholder={t("contactNamePlaceholder")} aria-invalid={!!errors.contact_name} {...form.register("contact_name")} />{errors.contact_name && <p className="mt-2 text-xs text-red-700">{t("required")}</p>}</div>
                  <div><label htmlFor="email" className={questionClass}>{t("email")}</label><input id="email" type="email" autoComplete="email" className={fieldClass} placeholder="you@business.com" aria-invalid={!!errors.email} {...form.register("email")} />{errors.email && <p className="mt-2 text-xs text-red-700">{t("validEmail")}</p>}</div>
                  <div><label htmlFor="phone" className={questionClass}>{t("phone")}</label><input id="phone" type="tel" autoComplete="tel" className={fieldClass} placeholder="(555) 123-4567" aria-invalid={!!errors.phone} {...form.register("phone")} />{errors.phone && <p className="mt-2 text-xs text-red-700">{t("validPhone")}</p>}</div>
                  <div className="rounded-2xl border border-[#e1e8dd] bg-[#f2f7ef] p-4 text-sm leading-6 text-[#4e6b57]">{t("contactNote")}</div>
                </>}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#ebeae3] px-6 py-5 sm:px-10">
                <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#547668] disabled:invisible"><ArrowLeft className="size-4" />{t("back")}</button>
                <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#176b67] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#105954] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b67] focus-visible:ring-offset-2">{step === 3 ? t("finishPreview") : t("continue")}<ArrowRight className="size-4" /></button>
              </div>
            </form>
          )}
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-[#879189]">{t("footerNote")}</p>
      </div>
    </main>
  )
}
