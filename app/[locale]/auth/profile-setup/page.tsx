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
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import { AREA_CODES_BY_STATE_MAP, getAllStates, getAreaCodesForState, type StateAbbrev } from "@/lib/area-codes"
import { useTranslations, useLocale } from "next-intl"
import { useLanguage } from "@/hooks/useLanguage"

export default function ProfileSetupPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const t = useTranslations('profileSetup')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { changeLanguage, isChanging } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
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
  const [isFetchingTaxRate, setIsFetchingTaxRate] = useState(false)
  const [selectedState, setSelectedState] = useState<StateAbbrev | null>(null)
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>("")

  // Fetch tax rate from zipcode API when step 3 loads
  useEffect(() => {
    const fetchTaxRate = async () => {
      if (step === 3 && formData.default_zip_code) {
        setIsFetchingTaxRate(true)
        try {
          const response = await fetch(`/api/zipcode?zip=${encodeURIComponent(formData.default_zip_code)}`)
          if (!response.ok) {
            throw new Error('Failed to fetch zipcode data')
          }
          const data = await response.json()
          
          // The API returns an array, get the first result
          if (Array.isArray(data) && data.length > 0) {
            const zipData = data[0]
            // Note: The API doesn't return tax rate directly, but we can use state information
            // For now, we'll use a default tax rate lookup by state
            // Common sales tax rates by state (approximate - can be enhanced with a proper tax API)
            const stateTaxRates: Record<string, string> = {
              'AL': '9.46',
              'AK': '1.82',
              'AZ': '8.52',
              'AR': '9.46',
              'CA': '8.99',
              'CO': '7.89',
              'CT': '6.35',
              'DE': '0.00',
              'FL': '6.98',
              'GA': '7.49',
              'HI': '4.50',
              'ID': '6.03',
              'IL': '8.96',
              'IN': '7.00',
              'IA': '6.94',
              'KS': '8.69',
              'KY': '6.00',
              'LA': '10.11',
              'ME': '5.50',
              'MD': '6.00',
              'MA': '6.25',
              'MI': '6.00',
              'MN': '8.14',
              'MS': '7.06',
              'MO': '8.44',
              'MT': '0.00',
              'NE': '6.98',
              'NV': '8.24',
              'NH': '0.00',
              'NJ': '6.60',
              'NM': '7.67',
              'NY': '8.54',
              'NC': '7.00',
              'ND': '7.09',
              'OH': '7.29',
              'OK': '9.06',
              'OR': '0.00',
              'PA': '6.34',
              'RI': '7.00',
              'SC': '7.49',
              'SD': '6.11',
              'TN': '9.61',
              'TX': '8.20',
              'UT': '7.42',
              'VT': '6.39',
              'VA': '5.77',
              'WA': '9.51',
              'WV': '6.59',
              'WI': '5.72',
              'WY': '5.56',
              'DC': '6.00'
            }
            
            const state = zipData.state
            if (state && stateTaxRates[state]) {
              setFormData(prev => ({
                ...prev,
                default_sales_tax_rate: stateTaxRates[state]
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching tax rate:', error)
          // Keep default value if fetch fails
        } finally {
          setIsFetchingTaxRate(false)
        }
      }
    }

    fetchTaxRate()
  }, [step, formData.default_zip_code])

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
    if (step === 1 && !formData.company_name) {
      setError(t('companyInfo.errors.companyNameRequired'))
      return
    }
    if (step === 1 && !formData.email) {
      setError(t('companyInfo.errors.emailRequired'))
      return
    }
    setError("")
    setStep(step + 1)
  }

  const handleBack = () => {
    setError("")
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    // Validate step 3 requirements
    if (step === 3) {
      if (!selectedState) {
        setError(t('opsAiNumber.errors.stateRequired'))
        setIsLoading(false)
        return
      }
      if (!selectedAreaCode) {
        setError(t('opsAiNumber.errors.areaCodeRequired'))
        setIsLoading(false)
        return
      }
    }
    
    setIsLoading(true)

    try {
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

      // Create profile
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

      // Upload logo if provided
      if (logoFile) {
        await api.uploadLogo(logoFile)
      }

      // Set up NeetoCal team member (and let backend optionally create a calendar link)
      // NeetoCal expects `emails: string[]` for the Team Members API.
      try {
        const meetingName = `Meeting with ${formData.company_name}`
        await api.createNeetoCalTeamMember({
          team_member_payload: {
            emails: [formData.email],
            name: formData.company_name,
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          meeting_payload: {
            name: meetingName,
            duration: 30, // 30 minute meetings by default
            host_email: formData.email,
            description: `Schedule a consultation with ${formData.company_name}`,
          },
          create_one_off_link: true,
          save_calendar_link_to_profile: true,
        })
      } catch (calendarErr) {
        // Log but don't fail profile creation if calendar setup fails
        console.error("Failed to set up calendar:", calendarErr)
      }

      // Refresh user data to include profile
      await refreshUser()

      // Send Twilio number request to SheetDB only when completing setup (step 3)
      // This happens after all profile operations are successful
      if (step === 3 && selectedState && selectedAreaCode) {
        try {
          const sheetDbUrl = process.env.NEXT_PUBLIC_SHEETDB_TWILIO
          if (sheetDbUrl) {
            await fetch(sheetDbUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                data: {
                  contractor_name: formData.company_name,
                  phone_number: formData.phone_number || "",
                  state: selectedState,
                  area_code: selectedAreaCode,
                  email: formData.email,
                  created_at: new Date().toISOString(),
                },
              }),
            })
          }
        } catch (sheetDbErr) {
          // Log but don't fail profile creation if SheetDB submission fails
          console.error("Failed to submit Twilio number request to SheetDB:", sheetDbErr)
        }
      }

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || t('errors.anErrorOccurred'))
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
        <div className="w-full max-w-3xl">
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

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s < step ? "bg-blue-500 text-white" :
                    s === step ? "bg-blue-500 text-white ring-4 ring-blue-200" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {s < step ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : s}
                  </div>
                  {s < 3 && <div className={`w-16 h-1 mx-2 rounded transition-all ${s < step ? "bg-blue-500" : "bg-gray-200"}`}></div>}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-16 text-sm text-gray-600 max-w-md mx-auto">
              <span className={`text-center ${step >= 1 ? "text-blue-600 font-medium" : ""}`}>{t('step1')}</span>
              <span className={`text-center ${step >= 2 ? "text-blue-600 font-medium" : ""}`}>{t('step2')}</span>
              <span className={`text-center ${step >= 3 ? "text-blue-600 font-medium" : ""}`}>{t('step3')}</span>
            </div>
          </div>

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

              {/* Step 1: Company Information */}
              {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('companyInfo.title')}</h2>
                    <p className="text-gray-600">{t('companyInfo.description')}</p>
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
                        onChange={(e) => setFormData({ ...formData, default_zip_code: e.target.value })}
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
                  </div>
                </div>
              )}

              {/* Step 2: Branding */}
              {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('branding.title')}</h2>
                    <p className="text-gray-600">{t('branding.description')}</p>
                  </div>

                  <div className="space-y-5">
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
              )}

              {/* Step 3: ContractorOpsAI Number */}
              {step === 3 && (
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
                            setSelectedAreaCode("") // Reset area code when state changes
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

                      <div className="space-y-2">
                        <Label htmlFor="selected_area_code" className="text-gray-700 font-medium">{t('opsAiNumber.areaCode')} *</Label>
                        <Select
                          value={selectedAreaCode}
                          onValueChange={(value) => setSelectedAreaCode(value)}
                          disabled={isLoading || !selectedState}
                        >
                          <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder={selectedState ? t('opsAiNumber.selectAreaCode') : t('opsAiNumber.selectStateFirst')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getAreaCodesForState(selectedState).map((areaCode) => (
                              <SelectItem key={areaCode} value={areaCode}>
                                {areaCode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

