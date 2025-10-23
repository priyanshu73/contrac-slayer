"use client"

import { useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { ContractorProfile } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"

export function SettingsTabs() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone_number: "",
    address: "",
    website_url: "",
    default_zip_code: "",
    default_labor_rate_per_hour: "",
    default_sales_tax_rate: "",
    default_markup_percentage: "",
    low_tier_markup: "",
    mid_tier_markup: "",
    high_tier_markup: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const data = await api.getMyProfile()
      setProfile(data)
      setFormData({
        company_name: data.company_name || "",
        email: data.email || "",
        phone_number: data.phone_number || "",
        address: data.address || "",
        website_url: data.website_url || "",
        default_zip_code: data.default_zip_code || "",
        default_labor_rate_per_hour: data.default_labor_rate_per_hour?.toString() || "",
        default_sales_tax_rate: data.default_sales_tax_rate?.toString() || "",
        default_markup_percentage: data.default_markup_percentage?.toString() || "",
        low_tier_markup: data.low_tier_markup?.toString() || "",
        mid_tier_markup: data.mid_tier_markup?.toString() || "",
        high_tier_markup: data.high_tier_markup?.toString() || "",
      })
      setLogoPreview(data.logo_url || null)
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleUploadLogo = async () => {
    if (!logoFile) return
    
    try {
      setIsSaving(true)
      setError("")
      const result = await api.uploadLogo(logoFile)
      setSuccessMessage("Logo uploaded successfully!")
      setLogoFile(null)
      await loadProfile()
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to upload logo")
    } finally {
      setIsSaving(false)
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
        default_labor_rate_per_hour: parseFloat(formData.default_labor_rate_per_hour),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="business" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
        <TabsTrigger value="business">Business</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-500/10 text-green-500 px-4 py-3 rounded-lg text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Business Settings */}
      <TabsContent value="business" className="space-y-6">
        {/* Logo Section */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Company Logo</h2>
          <div className="space-y-4">
            {logoPreview && (
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-lg border-2 border-border overflow-hidden bg-muted">
                  <Image
                    src={logoPreview}
                    alt="Company logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Current logo</p>
                  {profile?.logo_url && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {logoFile ? "New logo selected" : "Click below to change"}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New Logo</Label>
              <input
                ref={fileInputRef}
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  Choose File
                </Button>
                {logoFile && (
                  <Button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={isSaving}
                  >
                    {isSaving ? "Uploading..." : "Upload Logo"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 200x200px. PNG or JPG format.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Business Information</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-name">Company Name *</Label>
                <Input
                  id="business-name"
                  placeholder="Your Company Name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-email">Business Email *</Label>
                <Input
                  id="business-email"
                  type="email"
                  placeholder="contact@yourcompany.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-phone">Phone Number</Label>
                <Input
                  id="business-phone"
                  placeholder="(555) 123-4567"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-website">Website</Label>
                <Input
                  id="business-website"
                  placeholder="https://yourcompany.com"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-address">Business Address</Label>
                <Input
                  id="business-address"
                  placeholder="123 Main Street, City, State ZIP"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-zip">Default ZIP Code</Label>
                <Input
                  id="default-zip"
                  placeholder="90210"
                  value={formData.default_zip_code}
                  onChange={(e) => setFormData({ ...formData, default_zip_code: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={loadProfile} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Pricing & Rates</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labor-rate">Default Labor Rate ($/hour)</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="75.00"
                  value={formData.default_labor_rate_per_hour}
                  onChange={(e) => setFormData({ ...formData, default_labor_rate_per_hour: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Sales Tax Rate (%)</Label>
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
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-markup">Default Markup (%)</Label>
              <Input
                id="default-markup"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="20.00"
                value={formData.default_markup_percentage}
                onChange={(e) => setFormData({ ...formData, default_markup_percentage: e.target.value })}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Default markup percentage applied to materials and services
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">Quote Tier Markups</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="low-markup">Low Tier (%)</Label>
                  <Input
                    id="low-markup"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="15.00"
                    value={formData.low_tier_markup}
                    onChange={(e) => setFormData({ ...formData, low_tier_markup: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mid-markup">Mid Tier (%)</Label>
                  <Input
                    id="mid-markup"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="30.00"
                    value={formData.mid_tier_markup}
                    onChange={(e) => setFormData({ ...formData, mid_tier_markup: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="high-markup">High Tier (%)</Label>
                  <Input
                    id="high-markup"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="50.00"
                    value={formData.high_tier_markup}
                    onChange={(e) => setFormData({ ...formData, high_tier_markup: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These markups are used when generating multi-tier quotes for customers
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={loadProfile} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </Card>
      </TabsContent>

      {/* Integrations */}
      <TabsContent value="integrations" className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Connected Integrations</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Manage your connected services and integrations to enhance your workflow.
          </p>

          <div className="space-y-4">
            {/* Stripe Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Stripe</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Accept payments and manage invoices</p>
                  </div>
                  <span className="rounded-full bg-[var(--status-active)]/10 px-2.5 py-1 text-xs font-medium text-[var(--status-active)]">
                    Connected
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline">
                    Configure
                  </Button>
                  <Button size="sm" variant="outline">
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>

            {/* Email Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Email Service</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Send invoices and notifications via email</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Google Calendar</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Sync your jobs with Google Calendar</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>

            {/* SMS Integration */}
            <div className="flex items-start gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">SMS Notifications</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Send text message reminders to clients</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    Not Connected
                  </span>
                </div>
                <div className="mt-3">
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">AI-Powered Features</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your AI Pricing Assistant is active and analyzing market rates to help you create competitive quotes.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">
                  View AI Settings
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications" className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Email Notifications</h2>
          <p className="mb-6 text-sm text-muted-foreground">Choose which email notifications you want to receive.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-new-leads">New Leads</Label>
                <p className="text-sm text-muted-foreground">Get notified when you receive a new lead</p>
              </div>
              <Switch id="notify-new-leads" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-job-reminders">Job Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive reminders for upcoming jobs</p>
              </div>
              <Switch id="notify-job-reminders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-invoice-paid">Invoice Payments</Label>
                <p className="text-sm text-muted-foreground">Get notified when an invoice is paid</p>
              </div>
              <Switch id="notify-invoice-paid" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-overdue">Overdue Invoices</Label>
                <p className="text-sm text-muted-foreground">Alerts for overdue invoices</p>
              </div>
              <Switch id="notify-overdue" defaultChecked />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Push Notifications</h2>
          <p className="mb-6 text-sm text-muted-foreground">Manage your mobile push notification preferences.</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications on your mobile device</p>
              </div>
              <Switch id="push-enabled" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-job-updates">Job Updates</Label>
                <p className="text-sm text-muted-foreground">Updates about scheduled jobs</p>
              </div>
              <Switch id="push-job-updates" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-messages">Client Messages</Label>
                <p className="text-sm text-muted-foreground">New messages from clients</p>
              </div>
              <Switch id="push-messages" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Reminder Settings</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-reminder-time">Job Reminder Time</Label>
              <Input id="job-reminder-time" type="number" placeholder="24" defaultValue="24" />
              <p className="text-sm text-muted-foreground">Hours before job to send reminder</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-reminder-days">Invoice Reminder Days</Label>
              <Input id="invoice-reminder-days" type="number" placeholder="7" defaultValue="7" />
              <p className="text-sm text-muted-foreground">Days before due date to send reminder</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
