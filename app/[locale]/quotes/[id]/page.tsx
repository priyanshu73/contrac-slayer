"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, Copy, ChevronDown, Mail, Send, UserCircle, ExternalLink, FileText, BookOpen, FolderOpen, ArrowRight, Unlink, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { api, contractorAI } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"
import { BeforeAfterPanel, type BeforeAfterImagePair } from "@/components/before-after-panel"
import { PersonalizedQuoteView } from "@/components/personalized-quote-view"
import { ProposalBuilder } from "@/components/proposal-builder"
import { useAuth } from "@/contexts/AuthContext"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"
import { Job } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { NewProjectDialog } from "@/components/projects/new-project-dialog"
import { useLocale } from "next-intl"

function isBeforePhotoFilename(fileName?: string | null): boolean {
  if (!fileName) return false
  return /^before-photo/i.test(fileName) || /^before-/i.test(fileName)
}

function isAfterRenderFilename(fileName?: string | null): boolean {
  if (!fileName) return false
  return /^ai-after-render(?:-\d+)?\.png$/i.test(fileName)
}

function extractBeforeAfterIndex(fileName?: string | null): number | null {
  if (!fileName) return null

  const beforeMatch = fileName.match(/^before-photo(?:-(\d+))?/i) || fileName.match(/^before-(\d+)/i)
  if (beforeMatch) return beforeMatch[1] ? parseInt(beforeMatch[1], 10) : 1

  const afterMatch = fileName.match(/^ai-after-render(?:-(\d+))?\.png$/i)
  if (afterMatch) return afterMatch[1] ? parseInt(afterMatch[1], 10) : 1

  return null
}

function buildBeforeAfterPairsFromMedia(mediaItems: Job["project_media"] = []): BeforeAfterImagePair[] {
  const pairMap = new Map<number, BeforeAfterImagePair>()

  for (const media of mediaItems || []) {
    const index = extractBeforeAfterIndex(media.file_name)
    if (!index) continue

    const existing = pairMap.get(index) || {
      id: `saved-before-after-${index}`,
      beforePreview: "",
      beforeFile: null,
      beforeFileName: null,
      afterUrl: null,
      afterFileName: null,
      status: "saved" as const,
      error: null,
    }

    if (isBeforePhotoFilename(media.file_name)) {
      existing.beforePreview = media.file_url
      existing.beforeFileName = media.file_name
    }

    if (isAfterRenderFilename(media.file_name)) {
      existing.afterUrl = media.file_url
      existing.afterFileName = media.file_name
    }

    pairMap.set(index, existing)
  }

  return Array.from(pairMap.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, pair]) => ({
      ...pair,
      status: (pair.afterUrl ? "saved" : "pending") as BeforeAfterImagePair["status"],
    }))
    .filter((pair) => Boolean(pair.beforePreview || pair.afterUrl))
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = useLocale()
  const { user, loading: authLoading } = useAuth()
  const { number: contractorOpsAiNumber } = useContractorOpsNumber()
  const { toast } = useToast()
  const identifier = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPublicView, setIsPublicView] = useState(false)
  const [sendEmailOpen, setSendEmailOpen] = useState(false)
  const [sendEmailTo, setSendEmailTo] = useState("")
  const [sendEmailSending, setSendEmailSending] = useState(false)
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false)
  const [sentToEmail, setSentToEmail] = useState("")
  const [optionalNote, setOptionalNote] = useState("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [smsSentSuccessTo, setSmsSentSuccessTo] = useState<string | null>(null)
  const [followupSending, setFollowupSending] = useState(false)
  const [changeOrders, setChangeOrders] = useState<Job[]>([])
  const [revisedContractAmount, setRevisedContractAmount] = useState<{
    original_amount: number
    approved_change_orders_total: number
    revised_amount: number
  } | null>(null)

  // QBO invoice state
  const [qboConnected, setQboConnected] = useState(false)
  const [qboInvoiceLoading, setQboInvoiceLoading] = useState(false)
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false)
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false)
  const [beforeAfterImagePairs, setBeforeAfterImagePairs] = useState<BeforeAfterImagePair[]>([])
  const [deleteQuoteOpen, setDeleteQuoteOpen] = useState(false)
  const [deletingQuote, setDeletingQuote] = useState(false)
  const [activeView, setActiveView] = useState<"quote" | "proposal">("quote")
  const [convertToProjectOpen, setConvertToProjectOpen] = useState(false)
  const [linkProjectOpen, setLinkProjectOpen] = useState(false)
  const [linkableProjects, setLinkableProjects] = useState<{ id: number; title: string }[]>([])
  const [linkingProject, setLinkingProject] = useState(false)
  const [unlinkingProject, setUnlinkingProject] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    // Note: We don't include `user` in deps to prevent double fetching
    // when user object changes from null to populated
    if (authLoading || !identifier) return

    fetchJob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, authLoading])

  // Fetch projects list for the link-to-project dropdown
  useEffect(() => {
    if (!job || isPublicView || !user?.is_contractor) return
    let cancelled = false
    api.getProjects({ limit: 500 }).then((raw) => {
      if (cancelled) return
      const arr = Array.isArray(raw) ? raw : []
      setLinkableProjects(arr.map((p: any) => ({ id: p.id, title: p.title })).sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })))
    }).catch(() => {
      if (!cancelled) setLinkableProjects([])
    })
    return () => { cancelled = true }
  }, [job?.id, isPublicView, user?.is_contractor])

  const handleLinkProject = async (projectId: number) => {
    if (!job) return
    setLinkingProject(true)
    setLinkProjectOpen(false)
    try {
      await api.updateJob(job.id, { project_id: projectId })
      setJob((prev) => prev ? { ...prev, project_id: projectId } : prev)
      toast({ title: "Quote linked to project" })
    } catch {
      toast({ title: "Failed to link project", variant: "destructive" })
    } finally {
      setLinkingProject(false)
    }
  }

  const handleUnlinkProject = async () => {
    if (!job?.project_id) return
    setUnlinkingProject(true)
    try {
      await api.unlinkProjectQuote(job.project_id, job.id)
      setJob((prev) => prev ? { ...prev, project_id: undefined } : prev)
      toast({ title: "Quote unlinked from project" })
    } catch {
      toast({ title: "Failed to unlink project", variant: "destructive" })
    } finally {
      setUnlinkingProject(false)
    }
  }

  // Fetch Gmail status when contractor is viewing quote (enable/disable Send to client)
  useEffect(() => {
    if (!job || isPublicView || !user?.is_contractor) return
    let cancelled = false
    api.getGmailStatus().then((res) => {
      if (!cancelled) setGmailConnected(res.connected)
    }).catch(() => {
      if (!cancelled) setGmailConnected(false)
    })
    return () => { cancelled = true }
  }, [job, isPublicView, user?.is_contractor])

  // Fetch QBO status when contractor is viewing quote
  useEffect(() => {
    if (!job || isPublicView || !user?.is_contractor) return
    let cancelled = false
    api.getQBOStatus().then((res) => {
      if (!cancelled) setQboConnected(res.connected)
    }).catch(() => {
      if (!cancelled) setQboConnected(false)
    })
    return () => { cancelled = true }
  }, [job, isPublicView, user?.is_contractor])

  // When quote is INVOICED with a QBO invoice, sync payment from QBO (marks job PAID when paid in full)
  useEffect(() => {
    if (!job || isPublicView || !user?.is_contractor || !qboConnected) return
    const st = String(job.status ?? "").toUpperCase()
    if (st !== "INVOICED" || !job.qbo_invoice_id) return
    let cancelled = false
    api
      .syncQBOInvoicePaymentStatus(job.id)
      .then(async (res) => {
        if (cancelled || !res.updated) return
        try {
          const data = await api.getJob(job.id)
          if (!cancelled) {
            setJob(data as Job)
            fetchChangeOrderData(job.id)
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* QBO errors — keep showing INVOICED */
      })
    return () => {
      cancelled = true
    }
  }, [job?.id, job?.status, job?.qbo_invoice_id, qboConnected, isPublicView, user?.is_contractor])

  useEffect(() => {
    setBeforeAfterImagePairs(buildBeforeAfterPairsFromMedia(job?.project_media))
  }, [job?.id, job?.project_media])

  const fetchJob = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if identifier is numeric (job ID) or UUID (public link)
      const isNumeric = /^\d+$/.test(identifier)
      const isContractor = user?.is_contractor

      // Always try public link first if not numeric (UUID format)
      // Or if user is not authenticated (customer view)
      if (!isNumeric || !isContractor) {
        // Try as public link first (for customers or UUID format)
        try {
          const data = await api.getJobByPublicLink(identifier)
          setJob(data as Job)
          setIsPublicView(true)
          return // Successfully loaded as public view
        } catch (publicErr: any) {
          // If public link fails and it's numeric and user is contractor, try job ID
          if (isNumeric && isContractor) {
            try {
              const data = await api.getJob(parseInt(identifier))
              setJob(data as Job)
              setIsPublicView(false)
              if (user?.is_contractor) {
                fetchChangeOrderData((data as Job).id)
              }
              return
            } catch (err: any) {
              setError(publicErr.message || "Failed to load quote")
            }
          } else {
            // Customer trying to access - only public links work
            setError("Quote not found. Please use the link provided by your contractor.")
          }
        }
      } else {
        // Authenticated contractor viewing by numeric job ID
        try {
          const data = await api.getJob(parseInt(identifier))
          setJob(data as Job)
          setIsPublicView(false)
          if (user?.is_contractor) {
            fetchChangeOrderData((data as Job).id)
          }
        } catch (err: any) {
          setError(err.message || "Failed to load quote")
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quote")
    } finally {
      setLoading(false)
    }
  }

  const fetchChangeOrderData = async (jobId: number) => {
    if (!user?.is_contractor) return
    try {
      const [orders, revised] = await Promise.all([
        api.getChangeOrders(jobId),
        api.getRevisedContractAmount(jobId),
      ])
      setChangeOrders(orders as Job[])
      setRevisedContractAmount(revised as { original_amount: number; approved_change_orders_total: number; revised_amount: number })
    } catch {
      setChangeOrders([])
      setRevisedContractAmount(null)
    }
  }

  const handleCreateChangeOrder = async () => {
    if (!job) return
    try {
      const newJob = await api.createChangeOrder(job.id, { items: [] })
      router.push(`/quotes/${(newJob as Job).id}/edit`)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create change order",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'viewed': return 'bg-purple-100 text-purple-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Check if it's a date-only string (YYYY-MM-DD) to avoid timezone issues
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString)

    if (isDateOnly) {
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSendToClient = async () => {
    if (!job) return

    try {
      let publicLink = job.quote_public_link
      if (!publicLink) {
        try {
          publicLink = await api.generateQuotePublicLink(job.id)
          await fetchJob()
        } catch (err: any) {
          console.error("Failed to generate public link:", err)
          toast({
            title: "Error",
            description: "Failed to generate quote link. Please try again.",
            variant: "destructive",
          })
          return
        }
      }

      const gmail = await api.getGmailStatus()
      if (!gmail.connected) {
        toast({
          title: "Gmail not connected",
          description: (
            <>
              Connect Gmail in{" "}
              <Link href="/settings" className="underline font-medium">
                Settings → Integrations
              </Link>{" "}
              to send the quote from your inbox.
            </>
          ),
          variant: "destructive",
        })
        return
      }

      setSendEmailTo(job.client?.email ?? "")
      setSendEmailSuccess(false)
      setSentToEmail("")
      setOptionalNote("")
      setCopiedLink(false)
      setSendEmailOpen(true)
    } catch (err: any) {
      console.error("Failed to prepare send:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to prepare email.",
        variant: "destructive",
      })
    }
  }

  const getQuoteUrl = () => {
    if (!job?.quote_public_link || typeof window === "undefined") return ""
    const locale = (params.locale as string) || "en"
    return `${window.location.origin}/${locale}/quotes/${job.quote_public_link}`
  }

  const handleSendQuoteEmail = async () => {
    if (!job || !job.quote_public_link) return
    const to = sendEmailTo.trim()
    if (!to) {
      toast({
        title: "Enter email",
        description: "Please enter the client's email address.",
        variant: "destructive",
      })
      return
    }
    const quoteUrl = getQuoteUrl()
    if (!quoteUrl) {
      toast({
        title: "Error",
        description: "Quote link is not available.",
        variant: "destructive",
      })
      return
    }
    setSendEmailSending(true)
    try {
      await api.sendQuoteEmail(job.id, to, quoteUrl)
      setSentToEmail(to)
      setSendEmailSuccess(true)
      await fetchJob()
      toast({
        title: "Quote sent",
        description: `Sent to ${to}.`,
      })
    } catch (err: any) {
      const msg = err?.message ?? ""
      const isInvalidTo = /invalid to header|invalid email|valid email address/i.test(msg)
      toast({
        title: "Send failed",
        description: isInvalidTo ? "Please enter a valid email address in the To field and try again." : (msg || "Failed to send email."),
        variant: "destructive",
      })
    } finally {
      setSendEmailSending(false)
    }
  }

  const handleEdit = () => {
    router.push(`/quotes/${identifier}/edit`)
  }

  const handleDeleteQuote = async () => {
    if (!job) return

    setDeletingQuote(true)
    try {
      await api.deleteJob(job.id)
      toast({
        title: "Quote deleted",
        description: `Quote #${job.id} has been removed.`,
      })
      router.push(`/${locale}/quotes`)
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message || "Failed to delete quote.",
        variant: "destructive",
      })
    } finally {
      setDeletingQuote(false)
      setDeleteQuoteOpen(false)
    }
  }

  const handleCreateInvoice = async (alsoCreateQBO?: boolean) => {
    if (!job) return

    setQboInvoiceLoading(true)
    try {
      // 1. Always create native ContractorOps invoice
      const nativeResult = await api.createInvoiceFromJob(job.id)
      const invoiceId = nativeResult?.id

      // 2. Optionally create QBO invoice
      if (alsoCreateQBO && qboConnected && !job.qbo_invoice_id) {
        try {
          const qboResult = await api.createQBOInvoice(job.id, true)
          toast({
            title: "Invoice created",
            description: (
              <span>
                Invoice created in ContractorOps and QuickBooks.{" "}
                <a
                  href={qboResult.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  View in QuickBooks →
                </a>
              </span>
            ),
          })
        } catch (qboErr: any) {
          // Native invoice succeeded but QBO failed — still success
          toast({
            title: "Invoice created",
            description: `Invoice created in ContractorOps, but QuickBooks sync failed: ${qboErr?.message || "Unknown error"}`,
          })
        }
      } else {
        toast({
          title: "Invoice created",
          description: `Invoice ${nativeResult?.invoice_number || ""} has been created. View it in your Invoices tab.`,
        })
      }

      await fetchJob()

      // Navigate to the invoice detail
      if (invoiceId) {
        router.push(`/${locale}/invoices/${invoiceId}`)
      }
    } catch (err: any) {
      toast({
        title: "Failed to create invoice",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setQboInvoiceLoading(false)
    }
  }

  const handleSendInvoiceEmail = async () => {
    if (!job) return
    setSendingInvoiceEmail(true)
    try {
      const result = await api.sendQBOInvoiceEmail(job.id)
      toast({
        title: "Invoice sent",
        description: result.message || "Invoice emailed to client.",
      })
    } catch (err: any) {
      toast({
        title: "Failed to send invoice",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSendingInvoiceEmail(false)
    }
  }

  const handleSignatureUpdate = async () => {
    // Refresh job data after signature update
    await fetchJob()
  }

  const handleSendViaSms = async () => {
    if (!job || !user?.contractor_profile?.contractor_ai_sp_id) {
      toast({
        title: "SMS not available",
        description: "Contractor AI integration is not set up. Connect it in settings to send the quote via SMS.",
        variant: "destructive",
      })
      return
    }
    if (!contractorOpsAiNumber?.trim()) {
      toast({
        title: "Contractor Ops AI number required",
        description: "Set up your Contractor Ops AI number in Settings → Integrations to send the quote via SMS.",
        variant: "destructive",
      })
      return
    }
    const customerPhone = job.client?.phone || ""
    const customerName = job.client?.name || "Customer"
    if (!customerPhone) {
      toast({
        title: "No phone number",
        description: "Add a phone number for this client to send the quote via SMS.",
        variant: "destructive",
      })
      return
    }
    const quoteUrl = getQuoteUrl()
    if (!quoteUrl) {
      toast({
        title: "Quote link not ready",
        description: "Generate the quote link first, then try again.",
        variant: "destructive",
      })
      return
    }
    try {
      const message = `Hi ${customerName}, your quote is ready. View and sign here: ${quoteUrl}`
      await contractorAI.sendImmediateSms({
        sp_id: user.contractor_profile.contractor_ai_sp_id,
        customer_number: customerPhone,
        message_text: message,
        reference_type: "job",
        reference_id: job.id,
      })

      if (String(job.status || "").toUpperCase() === "DRAFT") {
        const updatedJob = await api.updateJob(job.id, { status: "SENT" })
        setJob(updatedJob as Job)
      }

      setSmsSentSuccessTo(customerName)
      setTimeout(() => setSmsSentSuccessTo(null), 5000)
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: "Failed to send SMS. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getDefaultFollowupMessage = () => {
    const customerName = job?.client?.name || "Customer"
    let msg = `Hi ${customerName}, just following up on the quote we sent. Do you have any questions?`
    if (job?.quote_public_link && typeof window !== "undefined") {
      const quoteUrl = `${window.location.origin}/quotes/${job.quote_public_link}`
      msg = `Hi ${customerName}, just following up on the quote we sent. You can view it here: ${quoteUrl}\n\nDo you have any questions?`
    }
    return msg
  }

  const handleSendFollowupSubmit = async (sendSms: boolean, sendEmail: boolean) => {
    if (!job || !user?.contractor_profile?.contractor_ai_sp_id) {
      toast({
        title: "Error",
        description: "Unable to send follow-up. Contractor AI integration not set up.",
        variant: "destructive",
      })
      return
    }
    const customerName = job.client?.name || "Customer"
    const customerPhone = job.client?.phone || ""
    const clientEmail = job.client?.email || ""

    if (sendSms && !customerPhone) {
      toast({
        title: "Error",
        description: "Customer phone number not found. Add a phone number for the client to send SMS.",
        variant: "destructive",
      })
      return
    }
    if (sendEmail && !clientEmail?.trim()) {
      toast({
        title: "Error",
        description: "Client email not found. Add an email for the client to send follow-up by email.",
        variant: "destructive",
      })
      return
    }
    if (!sendSms && !sendEmail) {
      toast({
        title: "Error",
        description: "Select at least one: SMS or Email.",
        variant: "destructive",
      })
      return
    }

    const message = getDefaultFollowupMessage()
    setFollowupSending(true)
    const results = { sms: false, email: false }
    try {
      if (sendSms && customerPhone) {
        await contractorAI.sendImmediateSms({
          sp_id: user.contractor_profile.contractor_ai_sp_id,
          customer_number: customerPhone,
          message_text: message,
          reference_type: "job",
          reference_id: job.id,
        })
        results.sms = true
      }
      if (sendEmail && clientEmail?.trim()) {
        await api.sendFollowupEmail(job.id, clientEmail.trim(), message)
        results.email = true
      }
      const parts = []
      if (results.sms) parts.push("SMS")
      if (results.email) parts.push("email")
      toast({
        title: "Follow-up sent!",
        description: `${parts.join(" and ")} sent to ${customerName} successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send follow-up",
        variant: "destructive",
      })
    } finally {
      setFollowupSending(false)
    }
  }

  const handleBeforeAfterOpenChange = async (open: boolean) => {
    setBeforeAfterOpen(open)
    if (!open && job) {
      try {
        const refreshedJob = await api.getJob(job.id)
        setJob(refreshedJob as Job)
      } catch {
        // If the quiet refresh fails, keep the current view and let the next manual refresh recover.
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Quote</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">The quote you're looking for doesn't exist.</p>
          {user?.is_contractor ? (
            <Button asChild>
              <a href="/quotes">Back to Quotes</a>
            </Button>
          ) : null}
        </Card>
      </div>
    )
  }

  // If public view, don't wrap in AuthGuard
  if (isPublicView) {
    const hasProposal = Boolean(job.proposal_document)
    const contractorName = job.contractor?.company_name || "Contractor"

    const navItems = [
      { id: "quote" as const, label: "Quote", icon: FileText, available: true },
      { id: "proposal" as const, label: "Proposal", icon: BookOpen, available: hasProposal },
    ]

    return (
      <div className="flex min-h-screen">
        {/* Left sidebar – desktop/tablet */}
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-40 flex-col bg-white border-r border-gray-200 px-3 pt-10 pb-6 print:hidden">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Documents</p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ id, label, icon: Icon, available }) => (
              <button
                key={id}
                onClick={() => available && setActiveView(id)}
                disabled={!available}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full",
                  !available
                    ? "cursor-not-allowed text-gray-300"
                    : activeView === id
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{available ? label : `No ${label.toLowerCase()}`}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="flex md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 gap-1 pt-2 pb-0 print:hidden">
          {navItems.map(({ id, label, icon: Icon, available }) => (
            <button
              key={id}
              onClick={() => available && setActiveView(id)}
              disabled={!available}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                !available
                  ? "cursor-not-allowed text-gray-300 border-transparent"
                  : activeView === id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {available ? label : `No ${label.toLowerCase()}`}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-40 mt-12 md:mt-0">
          {activeView === "quote" ? (
            <PersonalizedQuoteView
              job={job}
              showActions={true}
              onSignatureUpdate={handleSignatureUpdate}
              isContractor={false}
              isPublicView={true}
              hideProjectDescription={true}
            />
          ) : (
            <ProposalBuilder
              job={job}
              contractorName={contractorName}
              locale={locale}
              publicMode={true}
              onJobUpdated={(updatedJob) => setJob(updatedJob as Job)}
            />
          )}
        </div>
      </div>
    )
  }

  const contractorName = job?.contractor?.company_name || "Your contractor"
  const jobTitle = job?.title || "your project"
  const emailSubject = `Your quote for ${jobTitle} from ${contractorName}`

  // Authenticated contractor view
  return (
    <AuthGuard>
      <AppBreadcrumb
        className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 print:hidden"
        items={[
          { label: "Quotes", href: `/${locale}/quotes` },
          {
            label: job.created_from_job_id
              ? `Change Order #${identifier}`
              : `Quote #${identifier}`,
          },
        ]}
      />

      {/* Project linkage banner — shown for all statuses, contractors only, not in print */}
      {job.project_id ? (
        <div className="mx-4 sm:mx-6 md:mx-8 mt-3 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="h-4 w-4 shrink-0 text-sky-600" />
            <span className="text-sm text-sky-800 font-medium truncate">
              {linkableProjects.find((p) => p.id === job.project_id)?.title ?? "Linked to project"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-sky-700/60 hover:text-destructive hover:bg-destructive/10"
              onClick={handleUnlinkProject}
              disabled={unlinkingProject}
            >
              {unlinkingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Unlink
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-sky-300 bg-white text-sky-700 hover:bg-sky-100 hover:text-sky-800 h-8 gap-1.5 text-xs"
              onClick={() => router.push(`/${locale}/projects/${job.project_id}`)}
            >
              View Project
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-4 sm:mx-6 md:mx-8 mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 print:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">No project linked</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Popover open={linkProjectOpen} onOpenChange={setLinkProjectOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                  {linkingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Link to Project
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-56 p-1">
                {linkableProjects.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground text-center">No projects found</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto">
                    {linkableProjects.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-left hover:bg-muted transition-colors"
                        onClick={() => handleLinkProject(p.id)}
                      >
                        <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1.5 text-xs"
              onClick={() => setConvertToProjectOpen(true)}
            >
              Create Project
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <PersonalizedQuoteView
        job={job}
        showActions={true}
        proposalHref={`/${locale}/quotes/${job.id}/proposal`}
        onSendToClient={handleSendToClient}
        onSendViaSms={handleSendViaSms}
        sendToClientDisabled={
          !gmailConnected ||
          !job?.quote_public_link ||
          !job?.signature?.contractor_signed_at
        }
        sendViaSmsDisabled={
          !job?.quote_public_link ||
          !job?.signature?.contractor_signed_at ||
          !user?.contractor_profile?.contractor_ai_sp_id ||
          !contractorOpsAiNumber?.trim() ||
          !job?.client?.phone
        }
        smsSentSuccessTo={smsSentSuccessTo}
        onEdit={handleEdit}
        onDelete={() => setDeleteQuoteOpen(true)}
        onSendFollowupSubmit={handleSendFollowupSubmit}
        followupSending={followupSending}
        gmailConnected={gmailConnected}
        qboConnected={qboConnected}
        onCreateInvoice={handleCreateInvoice}
        creatingInvoice={qboInvoiceLoading}
        onSendInvoiceEmail={handleSendInvoiceEmail}
        sendingInvoiceEmail={sendingInvoiceEmail}
        onCreateChangeOrder={handleCreateChangeOrder}
        onOpenBeforeAfter={() => setBeforeAfterOpen(true)}
        onSignatureUpdate={handleSignatureUpdate}
        onStatusUpdate={() => { fetchJob(); fetchChangeOrderData(job.id) }}
        changeOrders={changeOrders}
        revisedContractAmount={revisedContractAmount ?? undefined}
        isContractor={true}
        isPublicView={false}
        hideProjectDescription={true}
      />
      <Dialog open={deleteQuoteOpen} onOpenChange={setDeleteQuoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete quote?</DialogTitle>
            <DialogDescription>
              This permanently removes quote #{job.id}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuoteOpen(false)} disabled={deletingQuote}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuote} disabled={deletingQuote}>
              {deletingQuote ? "Deleting..." : "Delete quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewProjectDialog
        open={convertToProjectOpen}
        onOpenChange={setConvertToProjectOpen}
        fromQuote={job ? {
          jobId: job.id,
          title: job.title || job.job_description || "",
          objective: job.job_description || "",
          startDate: job.start_date || "",
          endDate: job.end_date || "",
          clientId: job.client_id,
          contractValue: job.total_amount,
        } : undefined}
        onProjectCreated={(projectId) => {
          router.push(`/${locale}/projects/${projectId}`)
        }}
      />

      <Dialog open={beforeAfterOpen} onOpenChange={handleBeforeAfterOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>AI Before and After</DialogTitle>
            <DialogDescription>
              Upload a before photo, choose the saved quote items to include, and generate a before/after preview for this quote.
            </DialogDescription>
          </DialogHeader>
          {job && (
            <BeforeAfterPanel
              jobId={job.id}
              lineItems={(job.items || []).map((item) => ({
                title: item.title,
                description: item.custom_description,
                quantity: item.quantity,
                unitOfMeasure: item.unit_of_measure,
              }))}
              jobDescription={job.job_description || job.description || ""}
              jobTitle={job.title || ""}
              imagePairs={beforeAfterImagePairs}
              onImagePairsChange={setBeforeAfterImagePairs}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={sendEmailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendEmailSuccess(false)
            setOptionalNote("")
          }
          setSendEmailOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-xl shadow-xl rounded-xl p-6"
          showCloseButton
        >
          {sendEmailSuccess ? (
            /* Confirmation state */
            <div className="py-2">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <Check className="h-5 w-5 shrink-0" />
                  Quote sent to {sentToEmail}
                </DialogTitle>
                <DialogDescription>
                  Your client will receive the email from your Gmail with a secure View & Sign link.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2"
                  onClick={async () => {
                    const url = getQuoteUrl()
                    if (url) {
                      await navigator.clipboard.writeText(url)
                      setCopiedLink(true)
                      toast({ title: "Link copied" })
                      setTimeout(() => setCopiedLink(false), 2000)
                    }
                  }}
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedLink ? "Copied!" : "Copy share link"}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setSendEmailOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            /* Gmail-style compose: Review & Send Quote */
            <>
              <DialogHeader className="pb-2">
                <DialogTitle className="text-lg font-semibold">Review & Send Quote</DialogTitle>
              </DialogHeader>

              <div className="space-y-0 border-t">
                {/* From */}
                <div className="flex items-center gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0">From</span>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <span className="truncate text-sm font-medium">{contractorName} (me)</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </div>

                {/* To */}
                <div className="flex items-start gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0 pt-2.5">To</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Input
                      id="send-email-to"
                      type="email"
                      placeholder="Enter client email address"
                      value={sendEmailTo}
                      onChange={(e) => setSendEmailTo(e.target.value)}
                      className="min-h-11 w-full px-3 py-2.5 text-base"
                      autoComplete="email"
                      inputMode="email"
                    />
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="text-muted-foreground hover:text-foreground" disabled>
                        CC
                      </button>
                      <button type="button" className="text-muted-foreground hover:text-foreground" disabled>
                        BCC
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <div className="flex items-center gap-3 py-3 border-b px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0">Subject</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground" title={emailSubject}>
                    {emailSubject}
                  </p>
                </div>

                {/* Optional message */}
                <div className="flex gap-3 py-3 px-1">
                  <span className="text-muted-foreground text-sm w-12 shrink-0 pt-2.5" />
                  <textarea
                    id="optional-note"
                    placeholder="Add a short message (optional)"
                    value={optionalNote}
                    onChange={(e) => setOptionalNote(e.target.value)}
                    className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    rows={3}
                  />
                </div>

                {/* Email body preview */}
                <div className="rounded-lg border bg-muted/30 p-3 mx-1 mt-2">
                  <p className="text-xs text-muted-foreground mb-2">What your client will receive</p>
                  <div className="rounded-md border bg-background p-3 text-left space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Hi{job?.client?.name ? ` ${String(job.client.name).split(" ")[0]}` : ""},
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contractorName} has prepared a quote for <strong className="text-foreground">{jobTitle}</strong>.
                    </p>
                    <div className="py-1">
                      <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                        View & Sign Quote
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setSendEmailOpen(false)}
                  disabled={sendEmailSending}
                  className="order-2 sm:order-1 text-muted-foreground"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSendQuoteEmail}
                  disabled={sendEmailSending || !sendEmailTo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendEmailTo.trim())}
                  className="order-1 sm:order-2 text-base font-medium gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendEmailSending ? "Sending…" : "Send Quote"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AuthGuard>
  )
}
