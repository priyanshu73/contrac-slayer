"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export function AddClientForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tClients = useTranslations('clients')
  const tCommon = useTranslations('common')

  // Form state - simplified to essential fields only
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    billing_address: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Name is required"
    }
    if (!formData.email.trim()) {
      return "Email is required"
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare client data - only essential fields
      const clientData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      }

      // Add optional fields only if they have values
      if (formData.phone.trim()) clientData.phone = formData.phone.trim()
      if (formData.address.trim()) clientData.address = formData.address.trim()
      if (formData.billing_address.trim()) clientData.billing_address = formData.billing_address.trim()

      // Call API to create client
      await api.createClient(clientData)
      
      toast({
        title: "Client created",
        description: `${formData.name} has been added to your clients.`,
      })

      // Redirect to clients page
      router.push("/clients")
    } catch (err: any) {
      setError(err.message || "Failed to create client. Please try again.")
      toast({
        title: "Error",
        description: err.message || "Failed to create client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Contact Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{tClients('clientInformation')}</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {tClients('name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              {tClients('email')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john.smith@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{tClients('phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{tClients('address')}</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street, City, State ZIP"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_address">{tClients('billingAddress')}</Label>
            <Textarea
              id="billing_address"
              value={formData.billing_address}
              onChange={(e) => handleChange("billing_address", e.target.value)}
              placeholder={tClients('billingAddressHint')}
              className="min-h-[80px]"
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          type="submit" 
          size="lg" 
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {tCommon('loading')}
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {tClients('createClient')}
            </>
          )}
        </Button>
        <Button 
          type="button" 
          size="lg" 
          variant="outline"
          onClick={() => router.push("/clients")}
          disabled={loading}
        >
          {tCommon('cancel')}
        </Button>
      </div>
    </form>
  )
}

