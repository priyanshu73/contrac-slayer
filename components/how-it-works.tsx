"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, X, Plus, Package } from "lucide-react"
import { PhoneMessagePreview } from "@/components/phone-message-preview"

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-4 bg-white relative overflow-hidden dark:bg-background">
      <div className="absolute left-1/2 top-48 bottom-24 w-0.5 bg-gradient-to-b from-blue-200 via-teal-200 to-indigo-200 hidden lg:block" />

      {/* The vertical timeline line */}

      <div className="container mx-auto max-w-[95rem] relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">How it works</h2>
          <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
            ContractorOps AI provides a complete toolkit to grow your contracting business 10x faster without having to
            work 10x harder.
          </p>
        </div>

        <div className="max-w-[95rem] mx-auto relative">
          <div className="space-y-16 lg:space-y-20">
            {/* Step 1 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Timeline circle for step 1 (aligned to this step) */}
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-blue-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <div className="lg:pr-16 flex justify-center lg:justify-end">
                <PhoneMessagePreview />
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-4xl font-bold text-balance">AI Call & Text Listening</h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Never miss a client. AI listens to calls, reads texts, and automatically follows up with personalized
                  responses. It&apos;s text-based with no app downloads—clients use their built-in Messages; you capture
                  every lead opportunity.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Timeline circle for step 2 (aligned to this step) */}
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-teal-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-teal-600">2</span>
              </div>
              <div className="lg:order-2 lg:pl-16">
                <Card className="p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0EC] dark:from-teal-950/20 dark:to-emerald-900/20 border-teal-200/40 dark:border-teal-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-semibold">New Project Estimate</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-9 gap-1.5 text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                        >
                          <Sparkles className="h-4 w-4" />
                          Use AI
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 min-h-28 text-lg text-foreground leading-relaxed mb-4">
                      Backyard landscaping for Sarah Johnson. Need to install 1,200 sq ft of premium sod, build a 10x12
                      paver patio with natural stone, and plant 3 shade trees (oak or maple). Include soil prep and
                      grading.
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-black hover:bg-gray-800 text-white text-base"
                      variant="default"
                    >
                      Generate Estimate
                    </Button>
                  </Card>
                </Card>
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-4xl font-bold text-balance">Describe Your Project</h3>
                </div>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Provide your project description and images. Our AI understands your requirements and prepares a
                    comprehensive estimate based on your inputs.
                  </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Timeline circle for step 3 (aligned to this step) */}
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-indigo-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-indigo-600">3</span>
              </div>
              <div className="lg:pr-16">
                <Card className="p-5 bg-gradient-to-br from-[#E8E8F8] to-[#E0E0F5] dark:from-indigo-950/20 dark:to-purple-900/20 border-indigo-200/40 dark:border-indigo-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-5 shadow-lg">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b">
                        <span className="font-semibold text-lg">Backyard Landscaping Project</span>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between text-lg">
                          <div className="flex-1">
                            <div className="font-medium">Premium Sod Installation</div>
                            <div className="text-base text-muted-foreground">1,200 sq ft @ $1.35/sq ft</div>
                          </div>
                          <div className="font-semibold">$1,620.00</div>
                        </div>

                        <div className="flex items-start justify-between text-lg">
                          <div className="flex-1">
                            <div className="font-medium">Paver Patio (10x12)</div>
                            <div className="text-base text-muted-foreground">120 sq ft @ $18.50/sq ft</div>
                          </div>
                          <div className="font-semibold">$2,220.00</div>
                        </div>

                        <div className="flex items-start justify-between text-lg">
                          <div className="flex-1">
                            <div className="font-medium">Shade Trees - Oak</div>
                            <div className="text-base text-muted-foreground">3 units @ $185.00 ea</div>
                          </div>
                          <div className="font-semibold">$555.00</div>
                        </div>

                        <div className="flex items-start justify-between text-lg">
                          <div className="flex-1">
                            <div className="font-medium">Soil Prep & Grading</div>
                            <div className="text-base text-muted-foreground">1,200 sq ft</div>
                          </div>
                          <div className="font-semibold">$480.00</div>
                        </div>

                        <div className="flex items-start justify-between text-lg">
                          <div className="flex-1">
                            <div className="font-medium">Labor - Installation</div>
                            <div className="text-base text-muted-foreground">24 hrs @ $55.00/hr</div>
                          </div>
                          <div className="font-semibold">$1,320.00</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-lg">Total Estimate</span>
                          <span className="text-amber-600 text-2xl">$6,195.00</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Card>
              </div>

              <div className="lg:pl-16 order-first lg:order-last">
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-4xl font-bold text-balance">AI Generates Instant Estimates</h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  AI analyzes your project description and instantly generates a competitive quote based on local market data.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid lg:grid-cols-2 gap-12 items-center relative">
              {/* Timeline circle for step 4 (aligned to this step) */}
              <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full border-4 border-teal-400 bg-white/80 backdrop-blur-sm items-center justify-center z-20">
                <span className="text-2xl font-bold text-teal-600">4</span>
              </div>
              <div className="lg:order-2 lg:pl-16">
                <Card className="p-5 bg-gradient-to-br from-[#E8F4F0] to-[#DDF0EC] dark:from-teal-950/20 dark:to-emerald-900/20 border-teal-200/40 dark:border-teal-800/30 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  <Card className="bg-background/95 backdrop-blur p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                      <Package className="h-6 w-6 text-orange-600" />
                      <span className="font-semibold text-lg">AI Product Recommendations</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-20 w-20 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                          <img src="/images/home-depot.svg" alt="Home Depot" className="h-20 w-20 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">Flagstone Natural Paver 12x12</div>
                          <div className="text-base text-muted-foreground mt-1">Perfect for your patio project</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$3.48/sq ft</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-20 w-20 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                          <img src="/images/lowes.svg" alt="Lowe's" className="h-20 w-20 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">Red Oak Tree 7-8 ft Potted</div>
                          <div className="text-base text-muted-foreground mt-1">Fast-growing shade tree</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$179.99</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-20 w-20 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                          {/* Using Home Depot logo for Menards as requested */}
                          <img src="/images/home-depot.svg" alt="Home Depot (for Menards)" className="h-20 w-20 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-lg line-clamp-2">Premium Kentucky Bluegrass Sod</div>
                          <div className="text-base text-muted-foreground mt-1">High-quality lawn grass</div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-orange-600">$179.99</span>
                            <Button size="sm" variant="outline" className="h-8 text-base px-4 bg-transparent">
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Card>
              </div>

              <div className="lg:pr-16 lg:order-1">
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="text-4xl font-bold text-balance">Smart Product Suggestions</h3>
                </div>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  AI recommends the best products from Home Depot, Lowe's, and Menards based on your project needs with
                  real-time pricing and availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
