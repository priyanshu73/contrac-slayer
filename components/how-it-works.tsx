"use client"

import { Card } from "@/components/ui/card"
import { PhoneMessagePreview } from "@/components/phone-message-preview"
import { DispatchPreview } from "@/components/dispatch-preview"
import { JobCostingPreview } from "@/components/job-costing-preview"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Activity } from "lucide-react"

export function HowItWorks() {
  const t = useTranslations('landing')

  return (
    <section id="how-it-works" className="py-14 px-4 sm:py-20 md:py-32 bg-white relative overflow-hidden dark:bg-background">
      <div className="container mx-auto max-w-[95rem] relative z-10">
        <div className="text-center mb-10 md:mb-20">
          <h2 className="text-2xl font-bold mb-3 text-balance sm:text-3xl md:text-5xl md:mb-4">{t('howItWorksTitle')}</h2>
          <p className="text-sm text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed sm:text-base md:text-lg">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="max-w-[95rem] mx-auto relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 via-orange-200 to-emerald-200 hidden lg:block" />
          <div className="space-y-10 sm:space-y-14 lg:space-y-20">

            {/* Step 1: AI Leads */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-blue-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <div className="lg:pr-16 flex justify-center lg:justify-end order-last lg:order-none">
                <div className="w-full max-w-[320px] lg:max-w-none">
                  <PhoneMessagePreview />
                </div>
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-blue-400 bg-white items-center justify-center text-sm font-bold text-blue-600 shrink-0">1</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step1Title')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step1Body')}
                </p>
              </div>
            </div>

            {/* Step 2: Auto Quoting */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-indigo-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>

              <div className="lg:order-2 lg:pl-16">
                <Card className="p-3 sm:p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0EC] dark:from-indigo-950/20 dark:to-blue-900/20 border-indigo-200/40 dark:border-indigo-800/30 shadow-xl hover:-translate-y-1 transition-all">
                  <Card className="bg-background/95 backdrop-blur p-3 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3 md:mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
                      <span className="text-base font-semibold sm:text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" /> {t('step2NewProjectEstimate')}</span>
                    </div>

                    <div className="space-y-2 text-sm sm:text-base">
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded dark:hover:bg-zinc-900">
                        <span>{t('step2Materials')}</span>
                        <span className="font-semibold">$1,250.00</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded dark:hover:bg-zinc-900">
                        <span>{t('step2Labor')}</span>
                        <span className="font-semibold">$1,320.00</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded border-b border-gray-100 dark:border-zinc-800 dark:hover:bg-zinc-900">
                        <span>{t('step2Margin')}</span>
                        <span className="font-semibold">$642.50</span>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-center text-lg font-bold">
                      <span>{t('step2Total')}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">$3,212.50</span>
                    </div>

                    <Button size="lg" className="w-full bg-black hover:bg-gray-800 text-white text-base mt-4" variant="default">
                      {t('step2Send')}
                    </Button>
                  </Card>
                </Card>
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-indigo-400 bg-white items-center justify-center text-sm font-bold text-indigo-600 shrink-0">2</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step2DescribeTitle')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step2DescribeBody')}
                </p>
              </div>
            </div>

            {/* Step 3: Voice Dispatch */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-orange-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>

              <div className="lg:pr-16 order-last lg:order-none">
                <DispatchPreview />
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-orange-400 bg-white items-center justify-center text-sm font-bold text-orange-600 shrink-0">3</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step3Title')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step3Body')}
                </p>
              </div>
            </div>

            {/* Step 4: Job Costing / Financials */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-emerald-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-emerald-600">4</span>
              </div>

              <div className="lg:order-2 lg:pl-16">
                <JobCostingPreview />
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-emerald-400 bg-white items-center justify-center text-sm font-bold text-emerald-600 shrink-0">4</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step4Title')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step4Body')}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
