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
import { Check, Copy, ChevronDown, Mail, Send, UserCircle } from "lucide-react"
import { api, contractorAI } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"
import { PersonalizedQuoteView } from "@/components/personalized-quote-view"
import { useAuth } from "@/contexts/AuthContext"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"
import { Job } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
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

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    // Note: We don't include `user` in deps to prevent double fetching
    // when user object changes from null to populated
    if (authLoading || !identifier) return
    
    fetchJob()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, authLoading])

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

  const handleCreateInvoice = () => {
    // TODO: Implement create invoice functionality
    router.push(`/invoices/new?jobId=${identifier}`)
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
      setSmsSentSuccessTo(customerName)
      setTimeout(() => setSmsSentSuccessTo(null), 5000)
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err?.message || "Failed to send SMS.",
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
    return (
      <PersonalizedQuoteView
        job={job}
        showActions={true}
        onSignatureUpdate={handleSignatureUpdate}
        isContractor={false}
        isPublicView={true}
        hideProjectDescription={true}
      />
    )
  }

  const contractorName = job?.contractor?.company_name || "Your contractor"
  const jobTitle = job?.title || "your project"
  const emailSubject = `Your quote for ${jobTitle} from ${contractorName}`

  // Authenticated contractor view
  return (
    <AuthGuard>
      <PersonalizedQuoteView
        job={job}
        showActions={true}
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
        onSendFollowupSubmit={handleSendFollowupSubmit}
        followupSending={followupSending}
        gmailConnected={gmailConnected}
        onCreateInvoice={handleCreateInvoice}
        onSignatureUpdate={handleSignatureUpdate}
        onStatusUpdate={fetchJob}
        isContractor={true}
        isPublicView={false}
        hideProjectDescription={true}
      />
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