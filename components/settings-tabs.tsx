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
import { LogOut, CreditCard, ExternalLink, Copy, Building2, Globe, Phone, MapPin, DollarSign, Percent, Info, Pencil, Link2, Unlink, X, MessageSquare, Users, CalendarClock } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { formatPhoneForDisplay } from "@/lib/utils"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"

import { CostBookSettings } from "@/components/cost-book-settings"
import { AutoReplySettings } from "@/components/auto-reply-settings"
import { TeamSettings } from "@/components/team-settings"
import { FollowupsManager } from "@/components/followups-manager"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { MobileDarkModeToggle } from "@/components/mobile-dark-mode-toggle"
import { AddressData } from "@/lib/types/address"

type SettingsSection = "business" | "pricing" | "billing" | "integrations" | "language" | "cost-book" | "auto-reply" | "team" | "followups"

// Sub-sections that live behind the "Profile" top tab (shown via the left side-bar).
const PROFILE_SECTIONS: SettingsSection[] = ["business", "pricing", "team", "integrations", "billing", "auto-reply"]

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
  // Only the account owner manages billing. Default to showing it unless the
  // user is explicitly a non-owner (ADMIN/MEMBER), so owners are never blocked.
  const canSeeBilling = user?.role !== "ADMIN" && user?.role !== "MEMBER"
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
  const searchParams = useSearchParams()

  // When Your Frontline is enabled it owns all caller follow-up (voice + post-call
  // SMS), so the legacy Auto-reply tab is hidden. See docs/frontline_followup.md.
  const [frontlineEnabled, setFrontlineEnabled] = useState(false)

  // Gmail integration state
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string | null } | null>(null)
  const [gmailStatusLoading, setGmailStatusLoading] = useState(false)
  const [gmailDisconnectLoading, setGmailDisconnectLoading] = useState(false)

  // QuickBooks integration state
  const [qboStatus, setQboStatus] = useState<{ connected: boolean; company_name: string | null; auto_invoice: boolean; realm_id: string | null } | null>(null)
  const [qboStatusLoading, setQboStatusLoading] = useState(false)
  const [qboDisconnectLoading, setQboDisconnectLoading] = useState(false)
  const [qboAutoInvoiceLoading, setQboAutoInvoiceLoading] = useState(false)

  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone_number: "",
    address: "",
    website_url: "",
    default_zip_code: "",
    service_radius_miles: "",
    service_area_notes: "",
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
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [manualAddress, setManualAddress] = useState(false)

  // Use centralized hook for ContractorOps AI number
  const { number: contractorOpsAiNumber } = useContractorOpsNumber()

  // Check if form has unsaved changes (dirty state)
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData)
  }, [formData, initialFormData])

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab") as SettingsSection
    if (tab && ["business", "pricing", "billing", "integrations", "language", "cost-book", "auto-reply", "team", "followups"].includes(tab)) {
      setActiveSection(tab)
    }
  }, [searchParams])

  // Load Frontline status to decide whether the Auto-reply tab is shown.
  useEffect(() => {
    let cancelled = false
    api.getFrontlineSettings()
      .then((s) => { if (!cancelled) setFrontlineEnabled(!!s?.enabled) })
      .catch(() => { if (!cancelled) setFrontlineEnabled(false) })
    return () => { cancelled = true }
  }, [])

  // If Frontline turns out to be on, bounce off the (now hidden) Auto-reply tab
  // — covers deep links like ?tab=auto-reply.
  useEffect(() => {
    if (frontlineEnabled && activeSection === "auto-reply") {
      setActiveSection("business")
    }
  }, [frontlineEnabled, activeSection])

  const loadGmailStatus = async () => {
    setGmailStatusLoading(true)
    try {
      const data = await api.getGmailStatus()
      setGmailStatus(data)
    } catch {
      setGmailStatus(null)
    } finally {
      setGmailStatusLoading(false)
    }
  }

  const loadQboStatus = async () => {
    setQboStatusLoading(true)
    try {
      const data = await api.getQBOStatus()
      setQboStatus(data)
    } catch {
      setQboStatus(null)
    } finally {
      setQboStatusLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === "integrations") {
      loadGmailStatus()
      loadQboStatus()
    }
  }, [activeSection])

  // Show success/error from OAuth callback (?gmail=connected or ?gmail=error)
  useEffect(() => {
    const gmail = searchParams.get("gmail")
    if (gmail === "connected") {
      setSuccessMessage("Gmail connected successfully. You can send emails from your Gmail.")
      setActiveSection("integrations")
      loadGmailStatus()
      const t = setTimeout(() => setSuccessMessage(""), 4000)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        params.delete("gmail")
        params.delete("reason")
        const qs = params.toString()
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""))
      }
      return () => clearTimeout(t)
    } else if (gmail === "error") {
      const reason = (searchParams.get("reason") || "").toLowerCase()
      const detail = searchParams.get("detail")
      let message = "Google Account connection was denied or failed. Please try again."
      if (reason === "access_denied" || reason === "denied") {
        message = "Google Account connection was denied."
      }
      if (detail) {
        message = `${message} ${detail}`
      }
      setError(message)
      setActiveSection("integrations")
      loadGmailStatus()
      const t = setTimeout(() => setError(""), 4000)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        params.delete("gmail")
        params.delete("reason")
        const qs = params.toString()
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""))
      }
      return () => clearTimeout(t)
    }
  }, [searchParams])

  // Show success/error from QBO OAuth callback (?quickbooks=connected or ?quickbooks=error)
  useEffect(() => {
    const qb = searchParams.get("quickbooks")
    if (qb === "connected") {
      setSuccessMessage("QuickBooks connected successfully!")
      setActiveSection("integrations")
      loadQboStatus()
      const t = setTimeout(() => setSuccessMessage(""), 4000)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        params.delete("quickbooks")
        const qs = params.toString()
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""))
      }
      return () => clearTimeout(t)
    } else if (qb === "error") {
      setError("QuickBooks connection failed. Please try again.")
      setActiveSection("integrations")
      loadQboStatus()
      const t = setTimeout(() => setError(""), 4000)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search)
        params.delete("quickbooks")
        const qs = params.toString()
        window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""))
      }
      return () => clearTimeout(t)
    }
  }, [searchParams])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const data = await api.getMyProfile()
      setProfile(data)
      // Clean address for display: strip zip codes and country, keep street/city/state
      let displayAddress = data.address || ""
      if (displayAddress.includes(",")) {
        const parts = displayAddress.split(",").map((p: string) => p.trim())
        const cleaned = parts
          .map((p: string) => p.replace(/\s+\d{5}(-\d{4})?$/, ""))  // strip trailing zip
          .filter((p: string) => !/^\d{5}/.test(p) && !/united states|usa|^us$/i.test(p) && p.length > 0)
        displayAddress = cleaned.slice(0, 3).join(", ")
      }
      const newFormData = {
        company_name: data.company_name || "",
        email: data.email || "",
        phone_number: data.phone_number || "",
        address: displayAddress,
        website_url: data.website_url || "",
        default_zip_code: data.default_zip_code || "",
        service_radius_miles: data.service_radius_miles?.toString() || "",
        service_area_notes: data.service_area_notes || "",
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

      const profilePayload: Record<string, any> = {
        company_name: formData.company_name,
        email: formData.email,
        phone_number: formData.phone_number || null,
        address: formData.address || null,
        website_url: formData.website_url || null,
        default_zip_code: formData.default_zip_code || null,
        service_radius_miles: formData.service_radius_miles ? Math.max(1, parseInt(formData.service_radius_miles, 10)) : null,
        service_area_notes: formData.service_area_notes.trim() || null,
        default_labor_charge_type: formData.default_labor_charge_type,
        default_labor_rate_value: parseFloat(formData.default_labor_rate_value),
        default_labor_unit_type: formData.default_labor_unit_type || null,
        default_sales_tax_rate: parseFloat(formData.default_sales_tax_rate),
        default_markup_percentage: parseFloat(formData.default_markup_percentage),
        low_tier_markup: parseFloat(formData.low_tier_markup),
        mid_tier_markup: parseFloat(formData.mid_tier_markup),
        high_tier_markup: parseFloat(formData.high_tier_markup),
      }
      if (addressData) {
        profilePayload.address_data = addressData
      }
      await api.updateProfile(profilePayload)

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

  // Top-level tabs. "Profile" is a group that opens a left side-bar of sub-sections.
  const topTabs = [
    { id: "business" as const, label: t('business'), icon: Building2 },
    { id: "followups" as const, label: "Follow-ups", icon: CalendarClock },
    { id: "cost-book" as const, label: "Cost Book", icon: DollarSign },
  ]

  // Side-bar items shown inside the Profile tab. Team sits directly below Business.
  const profileSidebarItems = [
    { id: "business" as const, label: "Business", icon: Building2 },
    { id: "team" as const, label: "Team", icon: Users },
    { id: "pricing" as const, label: t('pricingRates'), icon: DollarSign },
    // Hidden when Frontline is enabled — it owns caller follow-up then.
    ...(frontlineEnabled
      ? []
      : [{ id: "auto-reply" as const, label: "Auto-reply", icon: MessageSquare }]),
    { id: "integrations" as const, label: "Integrations", icon: Link2 },
    ...(canSeeBilling ? [{ id: "billing" as const, label: "Billing", icon: CreditCard }] : []),
  ]

  const isProfileActive = PROFILE_SECTIONS.includes(activeSection)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Horizontal Tabs */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <div className="max-w-6xl mx-auto flex gap-1.5 sm:gap-2">
            {topTabs.map((item) => {
              // The Profile tab stays highlighted for any of its sub-sections.
              const active = item.id === "business" ? isProfileActive : activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-center rounded-full transition-colors ${
                    active
                      ? "border-2 border-blue-500 text-slate-900 bg-white"
                      : "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Success/Error Messages - Fixed position, auto-dismiss after 4s or click X */}
        {(successMessage || error) && (
          <div className="fixed top-16 right-6 z-50 animate-in slide-in-from-top-2 flex flex-col gap-2">
            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-3 pr-10 rounded-lg text-sm border border-emerald-200 shadow-lg relative">
                {successMessage}
                <button
                  type="button"
                  onClick={() => setSuccessMessage("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-emerald-100 text-emerald-700"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 pr-10 rounded-lg text-sm border border-red-200 shadow-lg relative">
                {error}
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-100 text-red-700"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-4 sm:py-6 pb-24 sm:pb-6">
          <div className="max-w-6xl mx-auto">
            <MobileDarkModeToggle />

            {/* Profile group: left side-bar + active sub-section content */}
            {isProfileActive && (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Side-bar */}
                <nav className="flex-shrink-0 sm:w-52">
                  <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
                    {profileSidebarItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
                            activeSection === item.id
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </nav>

                {/* Section content */}
                <div className="flex-1 min-w-0 space-y-6">
                {/* Business Information Card */}
                {activeSection === "business" && (
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

                        <div className="space-y-2">
                          <Label htmlFor="account-email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Account email (login)
                          </Label>
                          <Input
                            id="account-email"
                            type="email"
                            value={user?.email || ""}
                            readOnly
                            disabled
                            className="h-10 bg-slate-50 border-slate-200 text-slate-600"
                          />
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
                            <div className="flex items-center justify-between">
                              <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {t('businessAddress')}
                              </Label>
                              <button
                                type="button"
                                onClick={() => setManualAddress(!manualAddress)}
                                className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
                              >
                                {manualAddress ? "Use address search" : "Enter manually"}
                              </button>
                            </div>
                            {manualAddress ? (
                              <Input
                                id="address"
                                placeholder="123 Main Street, City, State ZIP"
                                value={formData.address}
                                onChange={(e) => {
                                  setFormData({ ...formData, address: e.target.value })
                                  setAddressData(null)
                                }}
                                disabled={isSaving}
                                className="h-10 border-slate-200"
                              />
                            ) : (
                              <MapboxAddressInput
                                label=""
                                placeholder="Start typing your business address..."
                                defaultValue={formData.address}
                                onAddressSelect={(data) => {
                                  setAddressData(data)
                                  if (data) {
                                    const short = [data.street_line, data.city, data.state].filter(Boolean).join(", ")
                                    setFormData((prev) => ({
                                      ...prev,
                                      address: short || data.formatted_address || "",
                                      default_zip_code: data.zip || prev.default_zip_code,
                                    }))
                                  }
                                }}
                                id="address"
                                className="[&_input]:h-10 [&_input]:border-slate-200"
                              />
                            )}
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

                        {/* Website & Language */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {t('language')}
                            </Label>
                            <LanguageSelector showLabel={false} triggerClassName="h-10 w-full border-slate-200" />
                          </div>
                        </div>

                        {/* Service area */}
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                          <div>
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              Service area
                            </Label>
                            <p className="mt-0.5 text-xs text-slate-400">
                              Helps the AI answer questions about how far you travel.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[10, 25, 50, 100].map((miles) => (
                              <button
                                key={miles}
                                type="button"
                                disabled={isSaving}
                                onClick={() => setFormData({ ...formData, service_radius_miles: String(miles) })}
                                className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
                                  formData.service_radius_miles === String(miles)
                                    ? "border-slate-700 bg-slate-800 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                                }`}
                              >
                                {miles} mi
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setFormData({ ...formData, service_radius_miles: "" })}
                              className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
                                formData.service_radius_miles && !["10", "25", "50", "100"].includes(formData.service_radius_miles)
                                  ? "border-slate-700 bg-slate-800 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                              }`}
                            >
                              Custom
                            </button>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            placeholder="Miles from your location"
                            value={formData.service_radius_miles}
                            onChange={(e) => setFormData({ ...formData, service_radius_miles: e.target.value })}
                            disabled={isSaving}
                            className="h-10 border-slate-200 bg-white"
                          />
                          <Input
                            placeholder="Specific cities or areas, e.g. Denver metro, Aurora — not Colorado Springs"
                            value={formData.service_area_notes}
                            onChange={(e) => setFormData({ ...formData, service_area_notes: e.target.value })}
                            disabled={isSaving}
                            className="h-10 border-slate-200 bg-white"
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

                )}

                {/* Pricing & Rates Card */}
                {activeSection === "pricing" && (
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
                )}

                {/* Integrations Section */}
                {activeSection === "integrations" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">Google Account</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-4">
                      Connect your Google Account to send emails (quotes, follow-ups) from your business address.
                    </p>

                    {gmailStatusLoading ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Checking connection…
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 p-1.5">
                              <svg className="h-full w-full" viewBox="0 0 24 24" aria-label="Google">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {gmailStatus?.connected ? "Connected" : "Not connected"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {gmailStatus?.connected && gmailStatus?.email
                                  ? gmailStatus.email
                                  : "Connect to send emails from your Google account."}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {gmailStatus?.connected ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm("Disconnect Google Account? You will need to connect again to send emails from your account.")) return
                                  setGmailDisconnectLoading(true)
                                  setError("")
                                  try {
                                    await api.disconnectGmail()
                                    setSuccessMessage("Gmail disconnected.")
                                    await loadGmailStatus()
                                    setTimeout(() => setSuccessMessage(""), 3000)
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : "Failed to disconnect Google Account")
                                  } finally {
                                    setGmailDisconnectLoading(false)
                                  }
                                }}
                                disabled={gmailDisconnectLoading}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              >
                                {gmailDisconnectLoading ? (
                                  <span className="flex items-center gap-2">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Disconnecting…
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <Unlink className="h-4 w-4" />
                                    Disconnect
                                  </span>
                                )}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const returnUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : ""
                                  window.location.href = api.getGmailAuthorizeUrl(returnUrl)
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <span className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4" />
                                  Connect Google Account
                                </span>
                              </Button>
                            )}
                          </div>
                        </div>
                        {gmailStatus?.connected && (
                          <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                            Disconnecting revokes access with Google and removes stored tokens. You can connect again anytime.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* QuickBooks Online Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">QuickBooks Online</h3>
                      {typeof window !== 'undefined' && ['contractorops.ai', 'www.contractorops.ai'].includes(window.location.hostname) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mb-4">
                      Connect QuickBooks to create and manage invoices. Clients can pay directly through QuickBooks.
                    </p>

                    {typeof window !== 'undefined' && ['contractorops.ai', 'www.contractorops.ai'].includes(window.location.hostname) ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 p-1 opacity-50">
                            <svg className="h-full w-full" viewBox="0 0 40 40" aria-label="QuickBooks">
                              <circle cx="20" cy="20" r="20" fill="#2CA01C" />
                              <path d="M11 14c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3h2v-2h-2c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h2v6.5c0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5V14h-2v9.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5V14h-4z" fill="white" />
                              <path d="M29 26c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3h-2v2h2c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-2v-6.5c0-2.49-2.01-4.5-4.5-4.5S18 15.01 18 17.5V26h2v-8.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V26h4z" fill="white" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">QuickBooks integration is coming soon</p>
                            <p className="text-xs text-slate-400">We&apos;re working on bringing this feature to production. Stay tuned!</p>
                          </div>
                        </div>
                      </div>
                    ) : qboStatusLoading ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Checking connection…
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 p-1">
                              <svg className="h-full w-full" viewBox="0 0 40 40" aria-label="QuickBooks">
                                <circle cx="20" cy="20" r="20" fill="#2CA01C" />
                                <path d="M11 14c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3h2v-2h-2c-.55 0-1-.45-1-1v-6c0-.55.45-1 1-1h2v6.5c0 2.49 2.01 4.5 4.5 4.5s4.5-2.01 4.5-4.5V14h-2v9.5c0 1.38-1.12 2.5-2.5 2.5s-2.5-1.12-2.5-2.5V14h-4z" fill="white" />
                                <path d="M29 26c1.66 0 3-1.34 3-3v-6c0-1.66-1.34-3-3-3h-2v2h2c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-2v-6.5c0-2.49-2.01-4.5-4.5-4.5S18 15.01 18 17.5V26h2v-8.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V26h4z" fill="white" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {qboStatus?.connected ? "Connected" : "Not connected"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {qboStatus?.connected && qboStatus?.company_name
                                  ? qboStatus.company_name
                                  : "Connect to push invoices to QuickBooks."}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {qboStatus?.connected ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm("Disconnect QuickBooks? You will need to connect again to push invoices.")) return
                                  setQboDisconnectLoading(true)
                                  setError("")
                                  try {
                                    await api.disconnectQBO()
                                    setSuccessMessage("QuickBooks disconnected.")
                                    await loadQboStatus()
                                    setTimeout(() => setSuccessMessage(""), 3000)
                                  } catch (err: unknown) {
                                    setError(err instanceof Error ? err.message : "Failed to disconnect QuickBooks")
                                  } finally {
                                    setQboDisconnectLoading(false)
                                  }
                                }}
                                disabled={qboDisconnectLoading}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              >
                                {qboDisconnectLoading ? (
                                  <span className="flex items-center gap-2">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Disconnecting…
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2">
                                    <Unlink className="h-4 w-4" />
                                    Disconnect
                                  </span>
                                )}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const returnUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : ""
                                  window.location.href = api.getQBOAuthorizeUrl(returnUrl)
                                }}
                                className="bg-[#2CA01C] hover:bg-[#238016]"
                              >
                                <span className="flex items-center gap-2">
                                  <Link2 className="h-4 w-4" />
                                  Connect QuickBooks
                                </span>
                              </Button>
                            )}
                          </div>
                        </div>
                        {qboStatus?.connected && (
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs text-slate-500">
                              Disconnecting revokes access with Intuit and removes stored tokens. You can connect again anytime.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === "billing" && canSeeBilling && (
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

            {/* Team Section */}
            {activeSection === "team" && (
              <TeamSettings />
            )}

            {/* Auto-reply Section — hidden entirely when Frontline is enabled */}
            {activeSection === "auto-reply" && !frontlineEnabled && (
              <AutoReplySettings />
            )}
                </div>
              </div>
            )}

            {/* Follow-ups Section */}
            {activeSection === "followups" && (
              <FollowupsManager />
            )}

            {/* Cost Book Section */}
            {activeSection === "cost-book" && (
              <CostBookSettings />
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
