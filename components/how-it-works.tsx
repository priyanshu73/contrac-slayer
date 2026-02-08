"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Package, Calendar, Check } from "lucide-react"
import { PhoneMessagePreview } from "@/components/phone-message-preview"
import { useTranslations } from "next-intl"

const STEP5_FALLBACKS: Record<string, string> = {
  step5WithLabel: "With",
  step5WhenLabel: "When",
  step5WhereLabel: "Where",
  step5TypeLabel: "Type",
  step5WithValue: "Customer",
  step5WhenValue: "Jan 20, 2026 at 1:00 PM",
  step5WhereValue: "309 Washington St, Gettysburg, PA",
  step5TypeValue: "Site visit or project discussion",
}

export function HowItWorks() {
  const t = useTranslations('landing')
  const step5 = (key: string) => {
    try {
      const value = t(key as any)
      if (typeof value !== 'string' || value === key) return STEP5_FALLBACKS[key] ?? key
      return value
    } catch {
      return STEP5_FALLBACKS[key] ?? key
    }
  }
  return (
    <section id="how-it-works" className="py-14 px-4 sm:py-20 md:py-32 bg-white relative overflow-hidden dark:bg-background">
      <div className="absolute left-1/2 top-48 bottom-24 w-0.5 bg-gradient-to-b from-blue-200 via-teal-200 via-indigo-200 to-purple-200 hidden lg:block" />

      <div className="container mx-auto max-w-[95rem] relative z-10">
        <div className="text-center mb-10 md:mb-20">
          <h2 className="text-2xl font-bold mb-3 text-balance sm:text-3xl md:text-5xl md:mb-4">{t('howItWorksTitle')}</h2>
          <p className="text-sm text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed sm:text-base md:text-lg">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="max-w-[95rem] mx-auto relative">
          <div className="space-y-10 sm:space-y-14 lg:space-y-20">
            {/* Step 1 */}
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

            {/* Step 2 */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-teal-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-teal-600">2</span>
              </div>
              <div className="lg:order-2 lg:pl-16">
                <Card className="p-3 sm:p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0EC] dark:from-teal-950/20 dark:to-emerald-900/20 border-teal-200/40 dark:border-teal-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-3 sm:p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <span className="text-base font-semibold sm:text-lg">{t('step2NewProjectEstimate')}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                        >
                          <Sparkles className="h-4 w-4" />
                          {t('step2UseAI')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 min-h-24 sm:min-h-28 text-sm sm:text-lg text-foreground leading-relaxed mb-3 md:mb-4">
                      {t('step2ProjectDesc')}
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-black hover:bg-gray-800 text-white text-base"
                      variant="default"
                    >
                      {t('step2GenerateEstimate')}
                    </Button>
                  </Card>
                </Card>
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-teal-400 bg-white items-center justify-center text-sm font-bold text-teal-600 shrink-0">2</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step2DescribeTitle')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step2DescribeBody')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-indigo-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-indigo-600">3</span>
              </div>
              <div className="lg:pr-16 order-last lg:order-none">
                <Card className="p-3 sm:p-5 bg-gradient-to-br from-[#E8E8F8] to-[#E0E0F5] dark:from-indigo-950/20 dark:to-purple-900/20 border-indigo-200/40 dark:border-indigo-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-3 sm:p-5 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b">
                        <span className="font-semibold text-lg">{t('step3ProjectTitle')}</span>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between text-sm sm:text-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{t('step3Line1')}</div>
                            <div className="text-xs sm:text-base text-muted-foreground">{t('step3Line1Detail')}</div>
                          </div>
                          <div className="font-semibold shrink-0 ml-2">$1,620.00</div>
                        </div>

                        <div className="flex items-start justify-between text-sm sm:text-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{t('step3Line2')}</div>
                            <div className="text-xs sm:text-base text-muted-foreground">{t('step3Line2Detail')}</div>
                          </div>
                          <div className="font-semibold shrink-0 ml-2">$2,220.00</div>
                        </div>

                        <div className="flex items-start justify-between text-sm sm:text-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{t('step3Line3')}</div>
                            <div className="text-xs sm:text-base text-muted-foreground">{t('step3Line3Detail')}</div>
                          </div>
                          <div className="font-semibold shrink-0 ml-2">$555.00</div>
                        </div>

                        <div className="flex items-start justify-between text-sm sm:text-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{t('step3Line4')}</div>
                            <div className="text-xs sm:text-base text-muted-foreground">{t('step3Line4Detail')}</div>
                          </div>
                          <div className="font-semibold shrink-0 ml-2">$480.00</div>
                        </div>

                        <div className="flex items-start justify-between text-sm sm:text-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{t('step3Line5')}</div>
                            <div className="text-xs sm:text-base text-muted-foreground">{t('step3Line5Detail')}</div>
                          </div>
                          <div className="font-semibold shrink-0 ml-2">$1,320.00</div>
                        </div>
                      </div>

                      <div className="pt-2 sm:pt-3 border-t">
                        <div className="flex items-center justify-between font-bold text-base sm:text-lg">
                          <span>{t('step3TotalEstimate')}</span>
                          <span className="text-amber-600 text-xl sm:text-2xl">$6,195.00</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Card>
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-indigo-400 bg-white items-center justify-center text-sm font-bold text-indigo-600 shrink-0">3</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step3Title')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step3Body')}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-teal-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-teal-600">4</span>
              </div>
              <div className="lg:order-2 lg:pl-16">
                <Card className="p-3 sm:p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0EC] dark:from-teal-950/20 dark:to-emerald-900/20 border-teal-200/40 dark:border-teal-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-3 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <Package className="h-6 w-6 text-orange-600" />
                      <span className="font-semibold text-lg">{t('step4AiProductRecs')}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">{t('step4Product1Name')}</div>
                          <div className="text-base text-muted-foreground mt-1">{t('step4Product1Desc')}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$3.48/sq ft</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              {t('step4Add')}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">{t('step4Product2Name')}</div>
                          <div className="text-base text-muted-foreground mt-1">{t('step4Product2Desc')}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$179.99</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              {t('step4Add')}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">{t('step4Product3Name')}</div>
                          <div className="text-base text-muted-foreground mt-1">{t('step4Product3Desc')}</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$179.99</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              {t('step4Add')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Card>
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-teal-400 bg-white items-center justify-center text-sm font-bold text-teal-600 shrink-0">4</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step4SmartSuggestions')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step4Body')}
                </p>
              </div>
            </div>

            {/* Step 5 - Smart Scheduling */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative">
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-purple-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <div className="lg:pr-16 order-last lg:order-none">
                <Card className="p-3 sm:p-5 bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] dark:from-purple-950/20 dark:to-violet-900/20 border-purple-200/40 dark:border-purple-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-3 sm:p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <Calendar className="h-6 w-6 text-purple-600" />
                      <span className="font-semibold text-lg">{t('step5MeetingDetected')}</span>
                    </div>

                    <dl className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4 space-y-2.5 text-sm sm:text-base">
                      <div className="flex gap-2 sm:gap-3">
                        <dt className="text-muted-foreground shrink-0 w-14 sm:w-16">{step5('step5WithLabel')}</dt>
                        <dd className="font-medium text-foreground">{step5('step5WithValue')}</dd>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <dt className="text-muted-foreground shrink-0 w-14 sm:w-16">{step5('step5WhenLabel')}</dt>
                        <dd className="text-foreground">{step5('step5WhenValue')}</dd>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <dt className="text-muted-foreground shrink-0 w-14 sm:w-16">{step5('step5WhereLabel')}</dt>
                        <dd className="text-foreground">{step5('step5WhereValue')}</dd>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <dt className="text-muted-foreground shrink-0 w-14 sm:w-16">{step5('step5TypeLabel')}</dt>
                        <dd className="text-foreground">{step5('step5TypeValue')}</dd>
                      </div>
                    </dl>

                    <p className="text-base text-muted-foreground mb-3 leading-relaxed">
                      {t('step5ReplyPrompt')}
                    </p>

                    <div className="flex gap-3 mb-4">
                      <Button className="flex-1 bg-black hover:bg-gray-800 text-white text-base h-11">
                        <Check className="h-4 w-4 mr-2" />
                        {t('step5Yes')}
                      </Button>
                      <Button variant="outline" className="flex-1 text-base h-11">
                        {t('step5No')}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-muted/30 border border-border/50">
                      <Check className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {t('step5MeetingScheduled')}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {t('step5CalendarLinkSent')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Card>
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-2 sm:gap-4 mb-3 md:mb-5">
                  <span className="flex lg:hidden h-8 w-8 rounded-full border-2 border-purple-400 bg-white items-center justify-center text-sm font-bold text-purple-600 shrink-0">5</span>
                  <h3 className="text-xl font-bold text-balance sm:text-2xl md:text-4xl">{t('step5Title')}</h3>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed sm:text-lg md:text-xl">
                  {t('step5Body')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
