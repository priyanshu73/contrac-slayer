"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

export default function ProfileSetupPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    phone_number: "",
    address: "",
    default_zip_code: "",
    website_url: "",
    default_labor_rate_per_hour: "75.00",
    default_sales_tax_rate: "8.25",
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
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
      })

      // Upload logo if provided
      if (logoFile) {
        await api.uploadLogo(logoFile)
      }

      // Refresh user data to include profile
      await refreshUser()
      router.push("/")
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              Tell us about your business to start receiving quote requests
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Company Information</h2>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  disabled={isLoading}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={isLoading}
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_zip_code">Default ZIP Code</Label>
                <Input
                  id="default_zip_code"
                  value={formData.default_zip_code}
                  onChange={(e) => setFormData({ ...formData, default_zip_code: e.target.value })}
                  disabled={isLoading}
                  placeholder="90210"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  disabled={isLoading}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Upload your company logo (optional)</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Default Rates</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_labor_rate_per_hour">Labor Rate ($/hour)</Label>
                  <Input
                    id="default_labor_rate_per_hour"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.default_labor_rate_per_hour}
                    onChange={(e) => setFormData({ ...formData, default_labor_rate_per_hour: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_sales_tax_rate">Sales Tax Rate (%)</Label>
                  <Input
                    id="default_sales_tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.default_sales_tax_rate}
                    onChange={(e) => setFormData({ ...formData, default_sales_tax_rate: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Complete Profile"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

