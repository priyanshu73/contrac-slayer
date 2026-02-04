"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { User, Mail, Phone, MapPin, FileText, AlertCircle, Plus, Loader2 } from "lucide-react"

export type CreatedClient = { id: number; name: string; email: string }

export interface AddClientFormProps {
  /** When true, form does not redirect on success; use onSuccess instead. */
  embedded?: boolean
  /** Called with the created client when embedded and submit succeeds. */
  onSuccess?: (client: CreatedClient) => void
}

export function AddClientForm({ embedded = false, onSuccess }: AddClientFormProps = {}) {
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
      const clientData: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      }

      // Add optional fields only if they have values
      if (formData.phone.trim()) clientData.phone = formData.phone.trim()
      if (formData.address.trim()) clientData.address = formData.address.trim()
      if (formData.billing_address.trim()) clientData.billing_address = formData.billing_address.trim()

      // Call API to create client
      const created = await api.createClient(clientData) as { id?: number; name?: string; email?: string } | undefined
      const createdClient: CreatedClient = {
        id: created?.id ?? 0,
        name: created?.name ?? formData.name.trim(),
        email: created?.email ?? formData.email.trim(),
      }

      toast({
        title: "Client created",
        description: `${formData.name} has been added to your clients.`,
      })

      if (embedded && onSuccess) {
        onSuccess(createdClient)
      } else {
        router.push("/clients")
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      const msg = String(errorObj?.message || "")
      // Friendly hint when phone conflicts with an archived client
      const friendly =
        msg.toLowerCase().includes("archived") && msg.toLowerCase().includes("unarchive")
          ? msg
          : (errorObj.message || "Failed to create client. Please try again.")
      setError(friendly)
      toast({
        title: "Error",
        description: friendly,
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
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Contact Information Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{tClients('clientInformation')}</h2>
          <p className="text-sm text-slate-500 mb-6">Enter the client&apos;s contact details</p>
          
          <div className="space-y-5">
            {/* Name & Email - 2 column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {tClients('name')} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="John Smith"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {tClients('email')} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="john@example.com"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tClients('phone')}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tClients('address')}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main Street, City, State ZIP"
                  className="pl-10 min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-2">
              <Label htmlFor="billing_address" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {tClients('billingAddress')}
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => handleChange("billing_address", e.target.value)}
                  placeholder={tClients('billingAddressHint')}
                  className="pl-10 min-h-[80px] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions - Inside card footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-3">
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {tClients('createClient')}
              </>
            )}
          </Button>
          {!embedded && (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => router.push("/clients")}
              disabled={loading}
            >
              {tCommon('cancel')}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

