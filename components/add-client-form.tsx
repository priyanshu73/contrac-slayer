"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

export function AddClientForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Required fields
    name: "",
    email: "",
    
    // Contact Information
    phone: "",
    address: "",
    
    // Business Information
    company_name: "",
    billing_address: "",
    tax_id: "",
    
    // Preferences
    preferred_contact_method: "",
    payment_terms: "",
    discount_percentage: "",
    
    // Additional Information
    notes: "",
    referral_source: "",
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
      // Prepare client data
      const clientData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      }

      // Add optional fields only if they have values
      if (formData.phone.trim()) clientData.phone = formData.phone.trim()
      if (formData.address.trim()) clientData.address = formData.address.trim()
      if (formData.company_name.trim()) clientData.company_name = formData.company_name.trim()
      if (formData.billing_address.trim()) clientData.billing_address = formData.billing_address.trim()
      if (formData.tax_id.trim()) clientData.tax_id = formData.tax_id.trim()
      if (formData.preferred_contact_method) clientData.preferred_contact_method = formData.preferred_contact_method
      if (formData.payment_terms.trim()) clientData.payment_terms = formData.payment_terms.trim()
      if (formData.discount_percentage.trim()) {
        const discount = parseFloat(formData.discount_percentage)
        if (!isNaN(discount) && discount >= 0 && discount <= 100) {
          clientData.discount_percentage = discount
        }
      }
      if (formData.notes.trim()) clientData.notes = formData.notes.trim()
      if (formData.referral_source.trim()) clientData.referral_source = formData.referral_source.trim()

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

      {/* Basic Contact Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Basic Contact Information</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
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
              Email <span className="text-red-500">*</span>
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
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street, City, State ZIP"
              className="min-h-[80px]"
            />
          </div>
        </div>
      </Card>

      {/* Business Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Business Information</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="ABC Corporation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_address">Billing Address</Label>
            <Textarea
              id="billing_address"
              value={formData.billing_address}
              onChange={(e) => handleChange("billing_address", e.target.value)}
              placeholder="If different from address above"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID / SSN</Label>
            <Input
              id="tax_id"
              type="text"
              value={formData.tax_id}
              onChange={(e) => handleChange("tax_id", e.target.value)}
              placeholder="XX-XXXXXXX"
            />
            <p className="text-xs text-muted-foreground">
              Tax ID for business clients or SSN for individuals (optional)
            </p>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preferred_contact_method">Preferred Contact Method</Label>
            <Select
              value={formData.preferred_contact_method}
              onValueChange={(value) => handleChange("preferred_contact_method", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preferred method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="text">Text Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Input
              id="payment_terms"
              type="text"
              value={formData.payment_terms}
              onChange={(e) => handleChange("payment_terms", e.target.value)}
              placeholder="e.g., Net 30, Net 15, Due on Receipt"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount_percentage">Discount Percentage</Label>
            <Input
              id="discount_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount_percentage}
              onChange={(e) => handleChange("discount_percentage", e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Special discount percentage for this client (0-100)
            </p>
          </div>
        </div>
      </Card>

      {/* Additional Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral_source">Referral Source</Label>
            <Input
              id="referral_source"
              type="text"
              value={formData.referral_source}
              onChange={(e) => handleChange("referral_source", e.target.value)}
              placeholder="e.g., Google, Referral from John, Facebook Ad"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any additional notes about this client..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Internal notes about the client (e.g., preferences, special instructions, etc.)
            </p>
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
              Creating Client...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Client
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
          Cancel
        </Button>
      </div>
    </form>
  )
}

