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
import { Phone, Mail, MapPin, Calendar, FileText, MessageSquare, Briefcase, Clock, Pencil, Trash2 } from "lucide-react"

interface ClientDetailData {
  id: number
  contractor_id: number
  name: string
  email: string
  phone?: string
  address?: string
  company_name?: string
  billing_address?: string
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
      setEditForm({
        name: clientData.name ?? "",
        email: clientData.email ?? "",
        phone: clientData.phone ?? "",
        address: clientData.address ?? "",
        company_name: clientData.company_name ?? "",
        billing_address: clientData.billing_address ?? "",
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
      if (editForm.billing_address.trim()) payload.billing_address = editForm.billing_address.trim()
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

  return (
    <div className="space-y-6">
      {/* Client Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-2xl font-semibold">{clientData.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{clientData.name}</h2>
                {clientData.company_name && (
                  <p className="mt-1 text-sm text-muted-foreground">{clientData.company_name}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  Client since {formatDate(clientData.created_at)}
                </p>
              </div>
              <Badge className={getStatusColor(clientData.status)}>
                {clientData.status}
              </Badge>
            </div>

            {/* Contact Information */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {clientData.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{formatPhoneForDisplay(clientData.phone)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{clientData.email}</span>
              </div>
              {clientData.address && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{clientData.address}</span>
                  <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(clientData.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      <span className="ml-1 text-xs">Directions</span>
                    </a>
                  </Button>
                </div>
              )}
              {clientData.billing_address && clientData.billing_address !== clientData.address && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">
                    <span className="font-medium">Billing:</span> {clientData.billing_address}
                  </span>
                  <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(clientData.billing_address)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      <span className="ml-1 text-xs">Directions</span>
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="mt-1 text-2xl font-bold">{clientData.total_jobs}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(clientData.total_revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Job Value</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(clientData.average_job_value)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quote Requests</p>
                <p className="mt-1 text-2xl font-bold">{clientData.leads.length}</p>
              </div>
            </div>

            {/* Additional Info */}
            {(clientData.payment_terms || clientData.preferred_contact_method || clientData.referral_source) && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {clientData.payment_terms && (
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Terms</p>
                    <p className="text-sm font-medium">{clientData.payment_terms}</p>
                  </div>
                )}
                {clientData.preferred_contact_method && (
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Contact</p>
                    <p className="text-sm font-medium capitalize">{clientData.preferred_contact_method}</p>
                  </div>
                )}
                {clientData.referral_source && (
                  <div>
                    <p className="text-xs text-muted-foreground">Referral Source</p>
                    <p className="text-sm font-medium">{clientData.referral_source}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {clientData.notes && (
              <div className="mt-4 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{clientData.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              {clientData.phone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${clientData.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </a>
                </Button>
              )}
              <Button variant="outline" asChild>
                <a href={`mailto:${clientData.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/quotes/new?clientId=${clientData.id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Quote
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quotes and Leads Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="quotes">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quotes">
              Quotes ({clientData.quotes.length})
            </TabsTrigger>
            <TabsTrigger value="leads">
              Quote Requests ({clientData.leads.length})
            </TabsTrigger>
          </TabsList>

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
              <Label htmlFor="edit-billing_address">Billing address</Label>
              <Textarea
                id="edit-billing_address"
                value={editForm.billing_address}
                onChange={(e) => setEditForm((f) => ({ ...f, billing_address: e.target.value }))}
                className="min-h-[80px]"
              />
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
