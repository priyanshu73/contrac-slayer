"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Phone, Mail, MapPin, Calendar, FileText, MessageSquare, Briefcase, Clock, Pencil, Trash2, DollarSign, MoreHorizontal } from "lucide-react"
import { PropertyInsightsCard } from "@/components/property-insights-card"

interface ClientDetailData {
  id: number
  contractor_id: number
  name: string
  email: string
  phone?: string
  address?: string
  address_data?: { id: number; street_line?: string } | null
  company_name?: string
  billing_address?: string
  billing_address_data?: { id?: number; street_line?: string } | null
  tax_id?: string
  status: string
  notes?: string
  total_revenue: number
  total_jobs: number
  average_job_value?: number
  preferred_contact_method?: string
  payment_terms?: string
  discount_percentage?: number
  first_job_date?: string
  last_job_date?: string
  referral_source?: string
  created_at: string
  updated_at?: string
  quotes: Array<{
    id: number
    job_number?: string
    title?: string
    status: string
    client_name: string
    job_description?: string
    project_type?: string
    estimated_total?: number
    final_total?: number
    created_at: string
    updated_at?: string
    quote_expiration_date?: string
    lead_id?: number
  }>
  leads: Array<{
    id: number
    name: string
    email: string
    phone?: string
    address?: string
    project_type?: string
    description?: string
    status: string
    source: string
    priority: number
    estimated_value?: number
    converted_to_job_id?: number
    converted_to_client_id?: number
    created_at: string
    updated_at?: string
  }>
}

const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [clientData, setClientData] = useState<ClientDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteDeleting, setDeleteDeleting] = useState(false)
  const [billingSameAsAddress, setBillingSameAsAddress] = useState(true)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company_name: "",
    billing_address: "",
    tax_id: "",
    status: "ACTIVE",
    notes: "",
    preferred_contact_method: "",
    payment_terms: "",
    discount_percentage: "",
    referral_source: "",
  })

  useEffect(() => {
    fetchClientDetails()
  }, [clientId])

  useEffect(() => {
    if (clientData && editOpen) {
      const billing = clientData.billing_address ?? ""
      const address = clientData.address ?? ""
      const sameAs = !billing.trim() || billing === address
      setBillingSameAsAddress(sameAs)
      setEditForm({
        name: clientData.name ?? "",
        email: clientData.email ?? "",
        phone: clientData.phone ?? "",
        address: address,
        company_name: clientData.company_name ?? "",
        billing_address: sameAs ? "" : billing,
        tax_id: clientData.tax_id ?? "",
        status: clientData.status ?? "ACTIVE",
        notes: clientData.notes ?? "",
        preferred_contact_method: clientData.preferred_contact_method ?? "",
        payment_terms: clientData.payment_terms ?? "",
        discount_percentage: clientData.discount_percentage != null ? String(clientData.discount_percentage) : "",
        referral_source: clientData.referral_source ?? "",
      })
    }
  }, [clientData, editOpen])

  const fetchClientDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getClientDetails(parseInt(clientId))
      setClientData(data as ClientDetailData)
    } catch (err: any) {
      console.error("Failed to fetch client details:", err)
      setError(err.message || "Failed to load client details")
      toast({
        title: "Error",
        description: "Failed to load client details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientData) return
    setEditSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        status: editForm.status,
      }
      if (editForm.phone.trim()) payload.phone = editForm.phone.trim()
      if (editForm.address.trim()) payload.address = editForm.address.trim()
      if (editForm.company_name.trim()) payload.company_name = editForm.company_name.trim()
      if (billingSameAsAddress) {
        payload.billing_same_as_address = true
      } else if (editForm.billing_address.trim()) {
        payload.billing_address = editForm.billing_address.trim()
      }
      if (editForm.tax_id.trim()) payload.tax_id = editForm.tax_id.trim()
      if (editForm.notes.trim()) payload.notes = editForm.notes.trim()
      if (editForm.preferred_contact_method.trim()) payload.preferred_contact_method = editForm.preferred_contact_method.trim()
      if (editForm.payment_terms.trim()) payload.payment_terms = editForm.payment_terms.trim()
      if (editForm.discount_percentage.trim()) {
        const num = parseFloat(editForm.discount_percentage)
        if (!isNaN(num)) payload.discount_percentage = num
      }
      if (editForm.referral_source.trim()) payload.referral_source = editForm.referral_source.trim()

      await api.updateClient(clientData.id, payload)
      setEditOpen(false)
      await fetchClientDetails()
      toast({
        title: "Client updated",
        description: "Client details have been saved.",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update client.",
        variant: "destructive",
      })
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!clientData) return
    setDeleteDeleting(true)
    try {
      await api.deleteClient(clientData.id)
      toast({
        title: "Client archived",
        description: `${clientData.name} has been archived.`,
      })
      setDeleteOpen(false)
      router.push("/clients")
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to archive client.",
        variant: "destructive",
      })
    } finally {
      setDeleteDeleting(false)
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "$0.00"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-600"
      case "INACTIVE":
        return "bg-yellow-500/10 text-yellow-600"
      case "ARCHIVED":
        return "bg-gray-500/10 text-gray-600"
      case "DRAFT":
        return "bg-gray-500/10 text-gray-600"
      case "SENT":
        return "bg-blue-500/10 text-blue-600"
      case "ACCEPTED":
        return "bg-green-500/10 text-green-600"
      case "REJECTED":
        return "bg-red-500/10 text-red-600"
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600"
      case "NEW":
        return "bg-blue-500/10 text-blue-600"
      case "CONTACTED":
        return "bg-yellow-500/10 text-yellow-600"
      case "QUOTED":
        return "bg-purple-500/10 text-purple-600"
      case "CONVERTED":
        return "bg-green-500/10 text-green-600"
      case "LOST":
      case "REJECTED":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getLeadSourceColor = (source: string) => {
    switch (source?.toUpperCase()) {
      case "WEBSITE_FORM":
        return "bg-blue-500/10 text-blue-600"
      case "PHONE_CALL":
        return "bg-green-500/10 text-green-600"
      case "EMAIL":
        return "bg-purple-500/10 text-purple-600"
      case "REFERRAL":
        return "bg-orange-500/10 text-orange-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 animate-pulse">
          <div className="h-32 bg-muted rounded"></div>
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
        </Card>
      </div>
    )
  }

  if (error || !clientData) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-6">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Client not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error || "The client you're looking for doesn't exist or hasn't been created yet."}
            </p>
            <Button variant="outline" asChild>
              <a href="/clients">Back to Clients</a>
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const hasDetails = Boolean(
    clientData.payment_terms || clientData.preferred_contact_method || clientData.referral_source || clientData.tax_id
  )

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* 1. Identity Card - Name | Service address (middle) | Phone & Email */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4 md:gap-6">
          {/* Left: Name + meta */}
          <div className="flex items-start gap-3 min-w-0 shrink-0">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-2 ring-primary/10">
              <span className="text-lg sm:text-xl font-bold">{clientData.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                <h1 className="text-xl font-bold sm:text-2xl tracking-tight">{clientData.name}</h1>
                <Badge className={getStatusColor(clientData.status)}>{clientData.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-sm text-muted-foreground">
                {clientData.company_name && (
                  <>
                    <span className="font-medium">{clientData.company_name}</span>
                    <span>·</span>
                  </>
                )}
                <span>Client since {formatDate(clientData.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Middle: Service address (and billing if different) */}
          {(clientData.address?.trim() || clientData.address_data?.street_line?.trim() || (clientData.billing_address?.trim() && clientData.billing_address !== clientData.address)) && (
            <div className="sm:flex-1 min-w-0 sm:border-x sm:border-border/60 sm:px-4 md:px-5 py-0 space-y-3">
              {(clientData.address?.trim() || clientData.address_data?.street_line?.trim()) && (
                <div>
                  <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Service address
                  </p>
                  <p className="text-sm text-foreground/90 leading-snug whitespace-pre-wrap">
                    {clientData.address?.trim() || clientData.address_data?.street_line || ""}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientData.address?.trim() || clientData.address_data?.street_line || "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    Open in Maps
                  </a>
                </div>
              )}
              {clientData.billing_address?.trim() && clientData.billing_address !== clientData.address && (
                <div>
                  <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Billing address
                  </p>
                  <p className="text-sm text-foreground/90 leading-snug whitespace-pre-wrap">
                    {clientData.billing_address}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientData.billing_address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    Open in Maps
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Right: Phone & Email */}
          <div className="flex flex-col gap-2 sm:items-end min-w-0 shrink-0">
            {clientData.phone && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto sm:min-w-[140px]" asChild>
                <a href={`tel:${clientData.phone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  {formatPhoneForDisplay(clientData.phone)}
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" className="w-full sm:w-auto sm:min-w-[140px]" asChild>
              <a href={`mailto:${clientData.email}`}>
                <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                Email
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Stats Grid - Individual cards with icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Jobs</p>
            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-2xl font-bold tabular-nums sm:text-3xl">{clientData.total_jobs}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-2xl font-bold tabular-nums text-green-600 sm:text-3xl">
            {formatCurrency(clientData.total_revenue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Avg Job</p>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-2xl font-bold tabular-nums sm:text-3xl">
            {formatCurrency(clientData.average_job_value)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Quotes</p>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-2xl font-bold tabular-nums sm:text-3xl">{clientData.quotes.length}</p>
        </Card>
      </div>

      {/* 3. Two-column: Tabs (left) + Client Details, Notes, Property Insights (right) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Quotes and Leads - Segmented tabs */}
          <Card className="p-6">
            <Tabs defaultValue="quotes">
              <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
                <TabsList className="w-full grid grid-cols-2 h-auto p-0 bg-transparent">
                  <TabsTrigger value="quotes" className="flex-1 px-4 py-2.5 rounded-md font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Quotes
                    <Badge variant="secondary" className="ml-2">{clientData.quotes.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="leads" className="flex-1 px-4 py-2.5 rounded-md font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    Quote Requests
                    <Badge variant="secondary" className="ml-2">{clientData.leads.length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="mt-4 space-y-3">
            {clientData.quotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No quotes created yet</p>
                <Button className="mt-4" asChild>
                  <a href={`/quotes/new?clientId=${clientData.id}`}>Create First Quote</a>
                </Button>
              </div>
            ) : (
              clientData.quotes.map((quote) => (
                <Card
                  key={quote.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          {quote.title || quote.job_number || `Quote #${quote.id}`}
                        </h3>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </div>
                      {quote.project_type && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {quote.project_type}
                        </p>
                      )}
                      {quote.job_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {quote.job_description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {formatDate(quote.created_at)}
                        </span>
                        {quote.quote_expiration_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {formatDate(quote.quote_expiration_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(quote.final_total || quote.estimated_total)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/quotes/${quote.id}`)
                        }}
                      >
                        View Details →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-4 space-y-3">
            {clientData.leads.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No quote requests yet</p>
              </div>
            ) : (
              clientData.leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{lead.name}</h3>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                        <Badge variant="outline" className={getLeadSourceColor(lead.source)}>
                          {lead.source.replace('_', ' ')}
                        </Badge>
                      </div>
                      {lead.project_type && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {lead.project_type}
                        </p>
                      )}
                      {lead.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {lead.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(lead.created_at)}
                        </span>
                        {lead.converted_to_job_id && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Briefcase className="h-3 w-3" />
                            Converted to Quote #{lead.converted_to_job_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                      {lead.estimated_value && (
                        <div className="text-sm font-semibold">
                          Est: {formatCurrency(lead.estimated_value)}
                        </div>
                      )}
                      {lead.converted_to_job_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/${lead.converted_to_job_id}`)
                          }}
                        >
                          View Quote →
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/new?leadId=${lead.id}`)
                          }}
                        >
                          Create Quote
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right column: Client Details, Notes, Property Insights */}
        <div className="space-y-6">
          {hasDetails && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Client Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Payment Terms</dt>
                  <dd className="font-medium">{clientData.payment_terms || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Preferred Contact</dt>
                  <dd className="font-medium capitalize">{clientData.preferred_contact_method || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Referral Source</dt>
                  <dd className="font-medium">{clientData.referral_source || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground mb-1">Tax ID</dt>
                  <dd className="font-medium font-mono text-sm">{clientData.tax_id || "—"}</dd>
                </div>
              </dl>
            </Card>
          )}

          {clientData.notes && (
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{clientData.notes}</p>
            </Card>
          )}

          {(clientData.address_data?.id ?? clientData.billing_address_data?.id) != null && (
            <PropertyInsightsCard
              addressId={(clientData.address_data?.id ?? clientData.billing_address_data?.id)!}
              title="Property insights"
              onRefresh={fetchClientDetails}
            />
          )}
        </div>
      </div>

      {/* Floating action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-4 md:relative md:bottom-auto md:left-auto md:right-auto md:border-0 md:bg-transparent md:p-0 md:z-auto">
        <div className="container mx-auto flex flex-wrap gap-3 md:flex-nowrap">
          <Button size="lg" className="flex-1 min-w-0 md:flex-initial" asChild>
            <a href={`/quotes/new?clientId=${clientData.id}`}>
              <FileText className="mr-2 h-5 w-5 shrink-0" />
              Create Quote
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild className="flex-1 min-w-0 md:flex-initial">
            <a href={`mailto:${clientData.email}`}>
              <Mail className="mr-2 h-5 w-5 shrink-0" />
              Email
            </a>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="outline" className="md:flex-initial">
                <MoreHorizontal className="h-5 w-5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company_name">Company name</Label>
              <Input
                id="edit-company_name"
                value={editForm.company_name}
                onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="edit-billing_address">Billing address</Label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <Checkbox
                    id="edit-billing-same-as"
                    checked={billingSameAsAddress}
                    onCheckedChange={(checked) => {
                      setBillingSameAsAddress(checked === true)
                      if (checked === true) setEditForm((f) => ({ ...f, billing_address: "" }))
                    }}
                  />
                  <span>Same as above</span>
                </label>
              </div>
              {billingSameAsAddress ? (
                <p className="text-sm text-muted-foreground py-2">Using primary address above.</p>
              ) : (
                <Textarea
                  id="edit-billing_address"
                  value={editForm.billing_address}
                  onChange={(e) => setEditForm((f) => ({ ...f, billing_address: e.target.value }))}
                  placeholder="Enter billing address if different"
                  className="min-h-[80px]"
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-tax_id">Tax ID</Label>
                <Input
                  id="edit-tax_id"
                  value={editForm.tax_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, tax_id: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discount_percentage">Discount %</Label>
                <Input
                  id="edit-discount_percentage"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={editForm.discount_percentage}
                  onChange={(e) => setEditForm((f) => ({ ...f, discount_percentage: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-preferred_contact_method">Preferred contact</Label>
                <Input
                  id="edit-preferred_contact_method"
                  value={editForm.preferred_contact_method}
                  onChange={(e) => setEditForm((f) => ({ ...f, preferred_contact_method: e.target.value }))}
                  placeholder="e.g. email, phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-payment_terms">Payment terms</Label>
                <Input
                  id="edit-payment_terms"
                  value={editForm.payment_terms}
                  onChange={(e) => setEditForm((f) => ({ ...f, payment_terms: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-referral_source">Referral source</Label>
              <Input
                id="edit-referral_source"
                value={editForm.referral_source}
                onChange={(e) => setEditForm((f) => ({ ...f, referral_source: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete (Archive) Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {clientData?.name}. You can still view archived clients from the clients list. This does not remove their quotes or history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              disabled={deleteDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDeleting ? "Archiving…" : "Archive client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
