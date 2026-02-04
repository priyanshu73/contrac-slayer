"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { ContractorProfile, LaborChargeType, UnitType } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { LogOut, CreditCard, ExternalLink, Copy, Building2, Globe, Phone, MapPin, DollarSign, Percent, Info, Pencil } from "lucide-react"
import { useLocale } from "next-intl"
import { formatPhoneForDisplay } from "@/lib/utils"

type SettingsSection = "business" | "billing" | "language"

// Skeleton component for loading states
function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Tabs Skeleton */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="max-w-6xl mx-auto flex gap-1.5 sm:gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-9 sm:h-10 bg-slate-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Business Card Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Logo Skeleton */}
              <div className="flex flex-col items-center sm:items-start flex-shrink-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-8 w-24 bg-slate-100 rounded mt-3 animate-pulse" />
                <div className="h-3 w-28 bg-slate-100 rounded mt-2 animate-pulse" />
              </div>
              
              {/* Form Fields Skeleton */}
              <div className="flex-1 space-y-4 sm:space-y-5">
                {/* Row 1 */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Row 2 */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
                      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Row 3 */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Website */}
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <div className="h-10 w-28 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-10 w-20 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Pricing Card Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-64 bg-slate-100 rounded mt-2 animate-pulse" />
            </div>
            {/* Labor Rate Highlight */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-slate-200 rounded mt-2 animate-pulse" />
                </div>
                <div className="h-8 w-28 bg-white rounded-lg animate-pulse" />
              </div>
              <div className="h-11 bg-white rounded-lg mt-4 animate-pulse" />
            </div>
            {/* Tax & Markup */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
                  <div className="h-11 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
            {/* Buttons */}
            <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
              <div className="h-10 w-28 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-10 w-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SettingsTabs() {
  const { user, logout } = useAuth()
  const locale = useLocale()
  const t = useTranslations('settings')
  const tAuth = useTranslations('auth')
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>("business")

  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone_number: "",
    address: "",
    website_url: "",
    default_zip_code: "",
    default_labor_charge_type: LaborChargeType.HOURLY as LaborChargeType,
    default_labor_rate_value: "",
    default_labor_unit_type: "" as UnitType | "",
    default_t_and_m_material_markup_percent: "",
    default_sales_tax_rate: "",
    default_markup_percentage: "",
    low_tier_markup: "",
    mid_tier_markup: "",
    high_tier_markup: "",
  })

  const [initialFormData, setInitialFormData] = useState(formData)
  
  const CONTRACTOR_OPS_AI_NUMBER_KEY = "contractorOpsAiNumber"
  const [contractorOpsAiNumber, setContractorOpsAiNumber] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
  })

  // Check if form has unsaved changes (dirty state)
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData)
  }, [formData, initialFormData])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const data = await api.getMyProfile()
      setProfile(data)
      const newFormData = {
        company_name: data.company_name || "",
        email: data.email || "",
        phone_number: data.phone_number || "",
        address: data.address || "",
        website_url: data.website_url || "",
        default_zip_code: data.default_zip_code || "",
        default_labor_charge_type: data.default_labor_charge_type || LaborChargeType.HOURLY,
        default_labor_rate_value: data.default_labor_rate_value?.toString() || "",
        default_labor_unit_type: (data.default_labor_unit_type || "") as UnitType | "",
        default_t_and_m_material_markup_percent: data.default_t_and_m_material_markup_percent?.toString() || "",
        default_sales_tax_rate: data.default_sales_tax_rate?.toString() || "",
        default_markup_percentage: data.default_markup_percentage?.toString() || "",
        low_tier_markup: data.low_tier_markup?.toString() || "",
        mid_tier_markup: data.mid_tier_markup?.toString() || "",
        high_tier_markup: data.high_tier_markup?.toString() || "",
      }
      setFormData(newFormData)
      setInitialFormData(newFormData)
      setLogoPreview(data.logo_url || null)
      
      // Load ContractorOpsAI number
      const cached = typeof window !== "undefined" ? localStorage.getItem(CONTRACTOR_OPS_AI_NUMBER_KEY) : null
      if (cached) setContractorOpsAiNumber(cached)
      try {
        const { twilio_number } = await api.getContractorOpsAiNumber()
        if (twilio_number && typeof window !== "undefined") {
          localStorage.setItem(CONTRACTOR_OPS_AI_NUMBER_KEY, twilio_number)
          setContractorOpsAiNumber(twilio_number)
        } else if (!twilio_number && typeof window !== "undefined") {
          localStorage.removeItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
          setContractorOpsAiNumber(null)
        }
      } catch {
        // Keep cached value if fetch fails
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Create preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Auto-upload the logo
      try {
        setIsSaving(true)
        setError("")
        await api.uploadLogo(file)
        setSuccessMessage("Logo uploaded successfully!")
        await loadProfile()
        setTimeout(() => setSuccessMessage(""), 3000)
      } catch (err: any) {
        setError(err.message || "Failed to upload logo")
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      setError("")
      setSuccessMessage("")

      await api.updateProfile({
        company_name: formData.company_name,
        email: formData.email,
        phone_number: formData.phone_number || null,
        address: formData.address || null,
        website_url: formData.website_url || null,
        default_zip_code: formData.default_zip_code || null,
        default_labor_charge_type: formData.default_labor_charge_type,
        default_labor_rate_value: parseFloat(formData.default_labor_rate_value),
        default_labor_unit_type: formData.default_labor_unit_type || null,
        default_sales_tax_rate: parseFloat(formData.default_sales_tax_rate),
        default_markup_percentage: parseFloat(formData.default_markup_percentage),
        low_tier_markup: parseFloat(formData.low_tier_markup),
        mid_tier_markup: parseFloat(formData.mid_tier_markup),
        high_tier_markup: parseFloat(formData.high_tier_markup),
      })

      setSuccessMessage("Profile updated successfully!")
      await loadProfile()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const getRateSuffix = () => {
    if (formData.default_labor_charge_type === LaborChargeType.PER_UNIT && formData.default_labor_unit_type === UnitType.SQ_FT) {
      return "/sq ft"
    }
    if (formData.default_labor_charge_type === LaborChargeType.PER_DAY) {
      return "/day"
    }
    return "/hr"
  }

  if (isLoading) {
    return <SettingsSkeleton />
  }

  const sidebarItems = [
    { id: "business" as const, label: t('business'), icon: Building2 },
    { id: "billing" as const, label: "Billing", icon: CreditCard },
    { id: "language" as const, label: t('language'), icon: Globe },
  ]

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Horizontal Tabs */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <div className="max-w-6xl mx-auto flex gap-1.5 sm:gap-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-center rounded-full transition-colors ${
                  activeSection === item.id
                    ? "border-2 border-blue-500 text-slate-900 bg-white"
                    : "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Error Messages - Fixed position */}
        {(successMessage || error) && (
          <div className="fixed top-16 right-6 z-50 animate-in slide-in-from-top-2">
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200 shadow-lg">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 shadow-lg">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-6 pb-24 sm:pb-6">
          <div className="max-w-6xl mx-auto">
            {/* Business Section */}
            {activeSection === "business" && (
              <div className="space-y-6">
                {/* Business Information Card - Combined */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {/* Logo Section - Left Side */}
                      <div className="flex flex-col items-center sm:items-start flex-shrink-0">
                        <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 ${
                          isSaving ? "opacity-50" : ""
                        }`}>
                          {logoPreview ? (
                            <Image
                              src={logoPreview}
                              alt="Company logo"
                              width={112}
                              height={112}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                              <span className="text-3xl font-bold text-slate-300">
                                {formData.company_name?.charAt(0)?.toUpperCase() || "C"}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSaving}
                          className="mt-3 text-sm"
                        >
                          Choose File
                        </Button>
                        <p className="text-xs text-slate-400 mt-2 text-center sm:text-left">
                          Square, 200×200px min.<br />PNG or JPG.
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </div>

                      {/* Form Fields - Right Side */}
                      <div className="flex-1 space-y-4 sm:space-y-5">
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="company-name" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('companyName')} *
                            </Label>
                            <Input
                              id="company-name"
                              placeholder="Your Company Name"
                              value={formData.company_name}
                              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                              disabled={isSaving}
                              className="h-10 border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('businessEmail')} *
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="contact@company.com"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              disabled={isSaving}
                              className="h-10 border-slate-200"
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('phoneNumber')}
                            </Label>
                            <Input
                              id="phone"
                              placeholder="(555) 123-4567"
                              value={formData.phone_number}
                              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                              disabled={isSaving}
                              className="h-10 border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contractorops-number" className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                              ContractorOpsAI Number
                            </Label>
                            <div className="relative">
                              <Input
                                id="contractorops-number"
                                value={contractorOpsAiNumber ? formatPhoneForDisplay(contractorOpsAiNumber) : "Not assigned yet"}
                                readOnly
                                disabled
                                className="h-10 bg-blue-50 border-blue-200 text-slate-900 font-mono font-medium pr-10"
                              />
                              {contractorOpsAiNumber && (
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(contractorOpsAiNumber)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
                                  title="Copy number"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Business Address & Zip */}
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('businessAddress')}
                            </Label>
                            <Input
                              id="address"
                              placeholder="123 Main Street, City, State ZIP"
                              value={formData.address}
                              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              disabled={isSaving}
                              className="h-10 border-slate-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="default-zip" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('defaultZipCode')}
                            </Label>
                            <Input
                              id="default-zip"
                              placeholder="90210"
                              value={formData.default_zip_code}
                              onChange={(e) => setFormData({ ...formData, default_zip_code: e.target.value })}
                              disabled={isSaving}
                              className="h-10 border-slate-200"
                            />
                          </div>
                        </div>

                        {/* Website */}
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {t('website')}
                          </Label>
                          <Input
                            id="website"
                            placeholder="https://yourcompany.com"
                            value={formData.website_url}
                            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                            disabled={isSaving}
                            className="h-10 border-slate-200"
                          />
                        </div>

                        {/* Save/Cancel Buttons */}
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving || !isDirty}
                          >
                            {isSaving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setFormData(initialFormData)
                            }}
                            disabled={isSaving || !isDirty}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing & Rates Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">{t('pricingRates')}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('pricingRatesDesc')}</p>
                    </div>

                    {/* Labor Rate Highlight Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">{t('defaultLaborRateValue')}</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">{t('laborRateTooltip')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-bold text-slate-900">
                              ${formData.default_labor_rate_value || "0"}
                            </span>
                            <span className="text-lg text-slate-500">{getRateSuffix()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                          <Select
                            value={
                              formData.default_labor_charge_type === LaborChargeType.PER_UNIT && formData.default_labor_unit_type === UnitType.SQ_FT
                                ? "PER_SF"
                                : formData.default_labor_charge_type || LaborChargeType.HOURLY
                            }
                            onValueChange={(value) => {
                              if (value === "PER_SF") {
                                setFormData({ 
                                  ...formData, 
                                  default_labor_charge_type: LaborChargeType.PER_UNIT,
                                  default_labor_unit_type: UnitType.SQ_FT
                                })
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  default_labor_charge_type: value as LaborChargeType,
                                  default_labor_unit_type: "" as UnitType | ""
                                })
                              }
                            }}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="w-[120px] h-8 border-0 bg-transparent text-sm">
                              <SelectValue placeholder="Rate type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={LaborChargeType.HOURLY}>Per Hour</SelectItem>
                              <SelectItem value={LaborChargeType.PER_DAY}>Per Day</SelectItem>
                              <SelectItem value="PER_SF">Per sf</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="75.00"
                            value={formData.default_labor_rate_value || ''}
                            onChange={(e) => setFormData({ ...formData, default_labor_rate_value: e.target.value })}
                            disabled={isSaving}
                            className="h-11 pl-10 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tax & Markup */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="tax-rate" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {t('salesTaxRate')}
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">{t('salesTaxTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="tax-rate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="8.25"
                            value={formData.default_sales_tax_rate}
                            onChange={(e) => setFormData({ ...formData, default_sales_tax_rate: e.target.value })}
                            disabled={isSaving}
                            className="h-11 pl-10 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="markup" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {t('defaultMarkup')}
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">{t('markupTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="markup"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="20.00"
                            value={formData.default_markup_percentage}
                            onChange={(e) => setFormData({ ...formData, default_markup_percentage: e.target.value })}
                            disabled={isSaving}
                            className="h-11 pl-10 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save/Cancel Buttons for Pricing */}
                    <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
                      <Button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={isSaving || !isDirty}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData(initialFormData)
                        }}
                        disabled={isSaving || !isDirty}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === "billing" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Subscription</h3>
                  
                  {user?.has_access ? (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-slate-600">Status</span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.stripe_subscription_status === 'active' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : user.stripe_subscription_status === 'trialing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {user.stripe_subscription_status === 'trialing' ? 'Free Trial' : 
                             user.stripe_subscription_status === 'active' ? 'Active' :
                             user.stripe_subscription_status || 'Unknown'}
                          </span>
                        </div>
                        
                        {user.stripe_subscription_status === 'trialing' && user.stripe_trial_end && (
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-600">Trial ends</span>
                            <span className="text-sm font-medium text-slate-900">
                              {new Date(user.stripe_trial_end).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        
                        {user.stripe_current_period_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                              {user.stripe_subscription_status === 'trialing' ? 'First billing date' : 'Next billing date'}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {new Date(user.stripe_current_period_end).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-500">
                        Manage your subscription, update payment method, or cancel your plan through the Stripe portal.
                      </p>

                      <Button
                        onClick={async () => {
                          setIsManagingSubscription(true)
                          try {
                            const baseUrl = window.location.origin
                            const result = await api.createPortalSession({
                              return_url: `${baseUrl}/${locale}/settings`,
                            })
                            window.location.href = result.url
                          } catch (err: any) {
                            setError(err.message || "Failed to open subscription portal")
                            setIsManagingSubscription(false)
                          }
                        }}
                        disabled={isManagingSubscription}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isManagingSubscription ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Opening...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Manage Subscription
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Status</span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            No active subscription
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-500">
                        Subscribe to get full access to all features including AI-powered quotes, lead management, and more.
                      </p>

                      <Button
                        onClick={() => {
                          window.location.href = `/${locale}/billing`
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          View Plans & Subscribe
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Language Section */}
            {activeSection === "language" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{t('language')}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
                    {t('chooseLanguageDesc')}
                  </p>
                  <div className="max-w-sm">
                    <LanguageSelector />
                  </div>
                </div>
              </div>
            )}

            {/* Logout Section */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
              <button
                onClick={logout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {tAuth('logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
