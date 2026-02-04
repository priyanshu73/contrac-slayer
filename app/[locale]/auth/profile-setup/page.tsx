"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import { AREA_CODES_BY_STATE_MAP, getAllStates, getAreaCodesForState, type StateAbbrev } from "@/lib/area-codes"
import { useTranslations, useLocale } from "next-intl"
import { useLanguage } from "@/hooks/useLanguage"

export default function ProfileSetupPage() {
  const router = useRouter()
  const { refreshUser, user, loading } = useAuth()
  const t = useTranslations('profileSetup')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { changeLanguage, isChanging } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitProgress, setSubmitProgress] = useState("")
  const [step, setStep] = useState(1)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone_number: "",
    address: "",
    default_zip_code: "",
    website_url: "",
    default_labor_rate_per_hour: "75.00",
    default_sales_tax_rate: "8.25",
    contractor_type: "",
  })
  const [otherContractorType, setOtherContractorType] = useState("")
  const [selectedState, setSelectedState] = useState<StateAbbrev | null>(null)
  const [selectedAreaCodes, setSelectedAreaCodes] = useState<string[]>([])
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([])

  const AI_ESTIMATOR_VIDEO_URL =
    process.env.NEXT_PUBLIC_AI_ESTIMATOR_VIDEO_URL ||
    "https://player.cloudinary.com/embed/?cloud_name=du4slyinf&public_id=AI_Estimator_English_jnlpte"

  // Use a dedicated Spanish onboarding video when locale is 'es'
  const AI_ESTIMATOR_VIDEO_URL_ES =
    "https://res.cloudinary.com/du4slyinf/video/upload/v1770017275/0201_2_w2nerd.mov"

  // If user already has a contractor profile, they should never see onboarding again.
  // AuthGuard treats /auth/* as public, so we enforce this redirect here.
  useEffect(() => {
    if (loading) return

    // If not logged in, go to login
    if (!user) {
      router.replace(`/${locale}/auth/login`)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const profile = await api.getMyProfile()
        if (!cancelled && profile) {
          router.replace(`/${locale}/dashboard`)
        }
      } catch (err: any) {
        // Expected when profile doesn't exist yet; ignore.
        const msg = String(err?.message ?? "").toLowerCase()
        if (msg && !msg.includes("not found") && !msg.includes("contractor profile")) {
          console.warn("Unexpected error checking contractor profile:", err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, user, router, locale])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.company_name) {
        setError(t('companyInfo.errors.companyNameRequired'))
        return
      }
      if (!formData.email) {
        setError(t('companyInfo.errors.emailRequired'))
        return
      }
    }
    if (step === 2) {
      if (!selectedState) {
        setError(t('opsAiNumber.errors.stateRequired'))
        return
      }
      if (!selectedAreaCodes.length) {
        setError(t('opsAiNumber.errors.areaCodeRequired'))
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const handleInvoiceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setInvoiceFiles((prev) => [...prev, ...Array.from(files)])
    e.target.value = ""
  }

  const removeInvoiceFile = (index: number) => {
    setInvoiceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBack = () => {
    setError("")
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    setSubmitProgress("Creating profile...")

    try {
      // Persist zipcode so we can derive tax rate after onboarding (single lookup post-redirect)
      try {
        if (formData.default_zip_code?.trim()) {
          localStorage.setItem("contractorops_pending_zip", formData.default_zip_code.trim())
        }
      } catch {
        // ignore (storage might be blocked)
      }

      // Format contractor_type: if "other", format as "other - {name}"
      let contractorType: string | null = null
      if (formData.contractor_type && formData.contractor_type.trim()) {
        if (formData.contractor_type === "other") {
          if (otherContractorType.trim()) {
            const formattedType = `other - ${otherContractorType.trim()}`
            // Ensure it doesn't exceed 50 characters
            if (formattedType.length > 50) {
              setError(t('errors.contractorTypeTooLong'))
              setIsLoading(false)
              setSubmitProgress("")
              return
            }
            contractorType = formattedType
          } else {
            contractorType = "other"
          }
        } else {
          contractorType = formData.contractor_type
        }
      }

      // Step 1: Create profile (required)
      setSubmitProgress("Creating profile...")
      await api.createContractorProfile({
        company_name: formData.company_name,
        email: formData.email,
        phone_number: formData.phone_number || null,
        address: formData.address || null,
        default_zip_code: formData.default_zip_code || null,
        website_url: formData.website_url || null,
        default_labor_rate_per_hour: parseFloat(formData.default_labor_rate_per_hour),
        default_sales_tax_rate: parseFloat(formData.default_sales_tax_rate),
        contractor_type: contractorType,
      })

      // Step 2: Refresh user to get profile data
      setSubmitProgress("Loading profile data...")
      await refreshUser()

      // Step 3: Run independent operations in parallel for better performance
      setSubmitProgress("Uploading files and completing setup...")
      const parallelOperations: Promise<any>[] = []

      // Upload logo
      if (logoFile) {
        parallelOperations.push(
          api.uploadLogo(logoFile).catch(err => {
            console.error("Logo upload failed:", err)
            return null
          })
        )
      }

      // Upload invoice attachments
      if (invoiceFiles.length > 0) {
        parallelOperations.push(
          api.uploadOnboardingAttachments(invoiceFiles).catch(err => {
            console.error("Failed to upload onboarding attachments:", err)
            return null
          })
        )
      }

      // Set up NeetoCal team member and calendar
      if (formData.email) {
        const meetingName = `Meeting with ${formData.company_name}`
        parallelOperations.push(
          api.createNeetoCalTeamMember({
            team_member_payload: {
              emails: [formData.email],
              name: formData.company_name,
              time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            meeting_payload: {
              name: meetingName,
              duration: 30,
              host_email: formData.email,
              description: `Schedule a consultation with ${formData.company_name}`,
            },
            create_one_off_link: false,
            save_calendar_link_to_profile: true,
          }).catch(err => {
            console.error("Failed to set up calendar:", err)
            return null
          })
        )
      }

      // Submit Twilio number request to SheetDB
      if (selectedState && selectedAreaCodes.length) {
        const sheetDbUrl = process.env.NEXT_PUBLIC_SHEETDB_TWILIO
        if (sheetDbUrl) {
          parallelOperations.push(
            fetch(sheetDbUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: [
                  {
                    contractor_name: formData.company_name,
                    phone_number: formData.phone_number || "",
                    state: selectedState,
                    area_code: selectedAreaCodes,
                    email: formData.email,
                    created_at: new Date().toISOString(),
                  },
                ],
              }),
            }).catch(err => {
              console.error("Failed to submit Twilio number request to SheetDB:", err)
              return null
            })
          )
        }
      }

      // Wait for all parallel operations to complete
      await Promise.allSettled(parallelOperations)

      setSubmitProgress("Finalizing setup...")
      router.push("/dashboard")
    } catch (err: any) {
      setError(t('errors.completeProfileToGetStarted'))
      setSubmitProgress("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className={`w-full ${step === 3 ? "max-w-6xl" : "max-w-3xl"}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
              {t('welcome')}
            </h1>
            <p className="text-gray-600 text-lg">
              {t('subtitle')}
            </p>
          </div>

          {/* Progress — 3 steps: clean stepper with filled track */}
          <div className="mb-10 w-full max-w-md mx-auto">
            <div className="relative flex items-start justify-between">
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 rounded-full" aria-hidden />
              <div
                className="absolute left-0 top-5 h-0.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                aria-hidden
              />
              {[1, 2, 3].map((s) => {
                const isActive = s === step
                const isComplete = s < step
                return (
                  <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                        isComplete
                          ? "border-blue-500 bg-blue-500 text-white"
                          : isActive
                            ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {isComplete ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-semibold">{s}</span>
                      )}
                    </div>
                    <span
                      className={`max-w-[6rem] text-center text-xs font-medium leading-tight sm:text-sm ${
                        isActive ? "text-slate-900" : isComplete ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {s === 1 ? t("step1") : s === 2 ? t("step2") : t("step3")}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Step {step} of 3
            </p>
          </div>

          {/* Step 3: Full-width video outside the card (so it can be much bigger) */}
          {step === 3 && (AI_ESTIMATOR_VIDEO_URL || AI_ESTIMATOR_VIDEO_URL_ES) && (() => {
            const videoUrl = locale === 'es' ? AI_ESTIMATOR_VIDEO_URL_ES : AI_ESTIMATOR_VIDEO_URL
            const isEmbed = videoUrl.includes('player.cloudinary.com/embed')
            return (
              <div className="mb-6 w-full">
                <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-black aspect-video w-full shadow-lg">
                  {isEmbed ? (
                    <iframe
                      src={videoUrl}
                      className="w-full h-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="AI Estimator video"
                    />
                  ) : (
                    <video
                      src={videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      playsInline
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">{t('aiEstimator.videoHint')}</p>
              </div>
            )
          })()}

          {/* Form Card */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-100 p-8">
            {/* Language Switcher - Only show in step 1 */}
            {step === 1 && (
              <div className="absolute -top-12 left-0 z-20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeLanguage(locale === 'en' ? 'es' : 'en')}
                  disabled={isChanging}
                  className="flex items-center gap-2 border-2 border-blue-300 hover:bg-blue-50 bg-white shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {locale === 'en' ? 'Español' : 'English'}
                </Button>
              </div>
            )}
            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext() }}>
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {isLoading && submitProgress && (
                <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <span className="font-medium">{submitProgress}</span>
                </div>
              )}

              {/* Step 1: Company info & branding (company info + logo + website at bottom) */}
              {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('companyInfoAndBranding.title')}</h2>
                    <p className="text-gray-600">{t('companyInfoAndBranding.description')}</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="company_name" className="text-gray-700 font-medium">{t('companyInfo.companyName')} *</Label>
                      <Input
                        id="company_name"
                        placeholder={t('companyInfo.companyNamePlaceholder')}
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        disabled={isLoading}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">{t('companyInfo.businessEmail')} *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('companyInfo.businessEmailPlaceholder')}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={isLoading}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_number" className="text-gray-700 font-medium">{t('companyInfo.phoneNumber')}</Label>
                      <Input
                        id="phone_number"
                        type="tel"
                        placeholder={t('companyInfo.phoneNumberPlaceholder')}
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        disabled={isLoading}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-gray-700 font-medium">{t('companyInfo.businessAddress')}</Label>
                      <Input
                        id="address"
                        placeholder={t('companyInfo.businessAddressPlaceholder')}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={isLoading}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="default_zip_code" className="text-gray-700 font-medium">{t('companyInfo.defaultZipCode')}</Label>
                      <Input
                        id="default_zip_code"
                        placeholder={t('companyInfo.defaultZipCodePlaceholder')}
                        value={formData.default_zip_code}
                        onChange={(e) => {
                          const nextZip = e.target.value
                          setFormData({ ...formData, default_zip_code: nextZip })
                          try {
                            if (nextZip?.trim()) {
                              localStorage.setItem("contractorops_pending_zip", nextZip.trim())
                            } else {
                              localStorage.removeItem("contractorops_pending_zip")
                            }
                          } catch {
                            // ignore
                          }
                        }}
                        disabled={isLoading}
                        maxLength={10}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contractor_type" className="text-gray-700 font-medium">{t('companyInfo.typeOfWork')}</Label>
                      <Select
                        value={formData.contractor_type}
                        onValueChange={(value) => {
                          setFormData({ ...formData, contractor_type: value })
                          if (value !== "other") {
                            setOtherContractorType("")
                          }
                        }}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder={t('companyInfo.selectSpecialty')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electrician">{t('companyInfo.contractorTypes.electrician')}</SelectItem>
                          <SelectItem value="plumber">{t('companyInfo.contractorTypes.plumber')}</SelectItem>
                          <SelectItem value="landscaping">{t('companyInfo.contractorTypes.landscaping')}</SelectItem>
                          <SelectItem value="remodeler">{t('companyInfo.contractorTypes.remodeler')}</SelectItem>
                          <SelectItem value="roofer">{t('companyInfo.contractorTypes.roofer')}</SelectItem>
                          <SelectItem value="hvac">{t('companyInfo.contractorTypes.hvac')}</SelectItem>
                          <SelectItem value="painter">{t('companyInfo.contractorTypes.painter')}</SelectItem>
                          <SelectItem value="carpenter">{t('companyInfo.contractorTypes.carpenter')}</SelectItem>
                          <SelectItem value="concrete">{t('companyInfo.contractorTypes.concrete')}</SelectItem>
                          <SelectItem value="flooring">{t('companyInfo.contractorTypes.flooring')}</SelectItem>
                          <SelectItem value="general_contractor">{t('companyInfo.contractorTypes.general_contractor')}</SelectItem>
                          <SelectItem value="other">{t('companyInfo.contractorTypes.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.contractor_type === "other" && (
                        <div className="mt-2">
                          <Input
                            id="other_contractor_type"
                            placeholder={t('companyInfo.specifySpecialty')}
                            value={otherContractorType}
                            onChange={(e) => setOtherContractorType(e.target.value)}
                            disabled={isLoading}
                            className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Branding at bottom of step 1 */}
                    <div className="pt-6 mt-6 border-t border-gray-200 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="logo" className="text-gray-700 font-medium">{t('branding.companyLogo')}</Label>
                        <div className="flex items-start gap-4">
                          {logoPreview && (
                            <div className="relative w-24 h-24 rounded-xl border-2 border-blue-200 overflow-hidden flex-shrink-0">
                              <Image
                                src={logoPreview}
                                alt="Logo preview"
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              id="logo"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              disabled={isLoading}
                              className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-2">{t('branding.logoUploadHint')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website_url" className="text-gray-700 font-medium">{t('branding.websiteUrl')}</Label>
                        <Input
                          id="website_url"
                          type="url"
                          placeholder={t('branding.websiteUrlPlaceholder')}
                          value={formData.website_url}
                          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                          disabled={isLoading}
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: ContractorOpsAI Number */}
              {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('opsAiNumber.title')}</h2>
                    <p className="text-gray-600">{t('opsAiNumber.description')}</p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="selected_state" className="text-gray-700 font-medium">{t('opsAiNumber.state')} *</Label>
                        <Select
                          value={selectedState || ""}
                          onValueChange={(value) => {
                            setSelectedState(value as StateAbbrev)
                            setSelectedAreaCodes([]) // Reset area codes when state changes
                          }}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder={t('opsAiNumber.selectState')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllStates().map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="selected_area_codes" className="text-gray-700 font-medium">{t('opsAiNumber.areaCode')} *</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                  aria-label={t('opsAiNumber.areaCodeTooltip')}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {t('opsAiNumber.areaCodeTooltip')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{t('opsAiNumber.areaCodeTooltip')}</p>
                        <div
                          id="selected_area_codes"
                          className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                        >
                          {selectedState ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                              {getAreaCodesForState(selectedState).map((areaCode) => (
                                <label
                                  key={areaCode}
                                  className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
                                >
                                  <Checkbox
                                    checked={selectedAreaCodes.includes(areaCode)}
                                    onCheckedChange={(checked) => {
                                      setSelectedAreaCodes((prev) =>
                                        checked
                                          ? [...prev, areaCode].sort()
                                          : prev.filter((c) => c !== areaCode)
                                      )
                                    }}
                                    disabled={isLoading}
                                  />
                                  <span className="text-sm font-mono">{areaCode}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">{t('opsAiNumber.selectStateFirst')}</p>
                          )}
                        </div>
                        {selectedAreaCodes.length > 0 && (
                          <p className="text-xs text-gray-600">
                            {t('opsAiNumber.areaCodesSelected', { count: selectedAreaCodes.length })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700 space-y-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-medium">{t('opsAiNumber.whatIsNumber')}</p>
                          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                            <li>{t('opsAiNumber.numberDescription')}</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-medium">{t('opsAiNumber.nextSteps')}</p>
                          <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
                            <li>{t('opsAiNumber.nextStepsDescription')}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: AI Estimator — intro in card; video is rendered above (outside card) */}
              {step === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('aiEstimator.title')}</h2>
                    <p className="text-gray-600">{t('aiEstimator.description')}</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-700 font-medium">{t('aiEstimator.invoiceUploadTitle')}</Label>
                    <p className="text-sm text-gray-600">{t('aiEstimator.invoiceUploadDescription')}</p>
                    <input
                      id="invoice-upload"
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      onChange={handleInvoiceFilesChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="invoice-upload"
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 py-8 px-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-600">{t('aiEstimator.chooseInvoices')}</span>
                      <span className="text-xs text-gray-500">{t('aiEstimator.invoiceFormats')}</span>
                    </label>
                    {invoiceFiles.length > 0 && (
                      <ul className="space-y-2 mt-3">
                        {invoiceFiles.map((file, index) => (
                          <li
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm"
                          >
                            <span className="truncate text-gray-700">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                              onClick={() => removeInvoiceFile(index)}
                              aria-label={tCommon('delete')}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-gray-500">{t('aiEstimator.invoiceOptional')}</p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('buttons.back')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`${step === 1 ? 'w-full' : 'flex-1'} h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] transition-all`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('buttons.saving')}</span>
                    </div>
                  ) : step === 3 ? (
                    <>
                      {t('buttons.completeSetup')}
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      {t('buttons.continue')}
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

