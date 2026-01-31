"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api, contractorAI } from "@/lib/api"
import { AuthGuard } from "@/components/auth-guard"
import { PersonalizedQuoteView } from "@/components/personalized-quote-view"
import { useAuth } from "@/contexts/AuthContext"
import { Job } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const identifier = params.id as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPublicView, setIsPublicView] = useState(false)

  useEffect(() => {
    if (identifier && !authLoading) {
      fetchJob()
    }
  }, [identifier, authLoading, user])

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
      // Generate public link if it doesn't exist (needed for both cases)
      let publicLink = job.quote_public_link
      if (!publicLink) {
        try {
          publicLink = await api.generateQuotePublicLink(job.id)
          // Refresh job data to get updated public link
          await fetchJob()
        } catch (error: any) {
          console.error("Failed to generate public link:", error)
          alert("Failed to generate quote link. Please try again.")
          return
        }
      }

      // Get client email
      const clientEmail = job.client?.email
      
      if (!clientEmail) {
        // If no email, prompt user to enter it
        const email = prompt("Please enter the client's email address:")
        if (!email || !email.trim()) {
          return // User cancelled or entered empty email
        }
        
        // Use the entered email
        const mailtoEmail = email.trim()
        await sendMailtoLink(mailtoEmail, job, publicLink)
        return
      }

      // Send mailto link with existing email
      await sendMailtoLink(clientEmail, job, publicLink)
    } catch (error: any) {
      console.error("Failed to send to client:", error)
      alert("Failed to prepare email. Please try again.")
    }
  }

  const sendMailtoLink = async (email: string, jobData: Job, publicLink?: string) => {
    // Get the public link (use provided or from job)
    const link = publicLink || jobData.quote_public_link
    
    if (!link) {
      alert("Quote public link is not available. Please try again.")
      return
    }

    // Construct the full URL
    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const quoteUrl = `${frontendUrl}/quotes/${link}`
    
    // Create email subject
    const quoteNumber = jobData.job_number || `#${jobData.id}`
    const subject = encodeURIComponent(`Quote ${quoteNumber} from ${jobData.contractor?.company_name || 'Your Contractor'}`)
    
    // Create email body
    const body = encodeURIComponent(
      `Hello,\n\n` +
      `Please review your quote at the following link:\n\n` +
      `${quoteUrl}\n\n` +
      `Thank you!`
    )
    
    // Create mailto link
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`
    
    // Open mailto link
    window.location.href = mailtoLink
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

  const handleSendFollowup = async () => {
    if (!job || !user?.contractor_profile?.contractor_ai_sp_id) {
      toast({
        title: "Error",
        description: "Unable to send follow-up. Contractor AI integration not set up.",
        variant: "destructive",
      })
      return
    }

    try {
      // Get the customer phone number from the job's client
      const customerPhone = job.client?.phone || ""
      const customerName = job.client?.name || "Customer"
      
      if (!customerPhone) {
        toast({
          title: "Error",
          description: "Customer phone number not found.",
          variant: "destructive",
        })
        return
      }

      // Build the message with quote link
      let message = `Hi ${customerName}, just following up on the quote we sent. Do you have any questions?`
      
      if (job.quote_public_link) {
        message = `Hi ${customerName}, just following up on the quote we sent. You can view it here: ${job.quote_public_link}\n\nDo you have any questions?`
      }

      // Send SMS immediately (not scheduled)
      await contractorAI.sendImmediateSms({
        sp_id: user.contractor_profile.contractor_ai_sp_id,
        customer_number: customerPhone,
        message_text: message,
      })

      toast({
        title: "Follow-up sent!",
        description: `SMS sent to ${customerName} successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send follow-up",
        variant: "destructive",
      })
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
      />
    )
  }

  // Authenticated contractor view
  return (
    <AuthGuard>
      <PersonalizedQuoteView
        job={job}
        showActions={true}
        onSendToClient={handleSendToClient}
        onEdit={handleEdit}
        onSendFollowup={handleSendFollowup}
        onCreateInvoice={handleCreateInvoice}
        onSignatureUpdate={handleSignatureUpdate}
        isContractor={true}
        isPublicView={false}
      />
    </AuthGuard>
  )
}