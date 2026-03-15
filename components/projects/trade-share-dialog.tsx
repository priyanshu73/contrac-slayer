"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink, Loader2, SendIcon, UserCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api, contractorAI } from "@/lib/api"
import type { ProjectTrade } from "@/lib/types"

function getTradeScopeLink(trade: ProjectTrade, locale = "en"): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/${locale}/projects/trade/${trade.uuid}`
}

const defaultEmailSubject = (projectTitle: string, tradeType: string) =>
  `Your scope: ${tradeType} – ${projectTitle}`

const defaultEmailBody = (subcontractorName: string, projectTitle: string, scopeLink: string) =>
  `Hi ${subcontractorName},

Your scope for "${projectTitle}" is ready. You can view details and accept it here:

${scopeLink}

Let us know if you have any questions.`

const defaultSmsMessage = (subcontractorName: string, projectTitle: string, scopeLink: string) =>
  `Hi ${subcontractorName}, your scope for ${projectTitle} is ready. View and accept here: ${scopeLink}`

/** Escape for HTML text content (no tags) */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Build formatted HTML email body for scope link (button CTA, no raw URL in text). */
function buildScopeEmailHtml(
  subcontractorName: string,
  projectTitle: string,
  scopeLink: string,
  customMessage?: string
): string {
  const name = escapeHtml((subcontractorName || "").trim())
  const project = escapeHtml((projectTitle || "").trim())
  const firstName = name.split(/\s+/)[0] || "there"
  const ctaBlue = "#2563eb"

  const intro = customMessage?.trim()
    ? customMessage.replace(/\n/g, "<br>").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    : `Your scope for &quot;${project}&quot; is ready. You can view details and accept it using the button below.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Scope ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi${firstName ? ` ${escapeHtml(firstName)}` : ""},
              </p>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                ${intro}
              </p>
              <table role="presentation" style="width: 100%; margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${scopeLink.replace(/&/g, "&amp;")}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${ctaBlue}; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                      View scope here
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Let us know if you have any questions.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ----- Send via Email -----

interface TradeSendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: ProjectTrade | null
  projectTitle: string
  locale?: string
  onSent?: () => void
}

export function TradeSendEmailDialog({
  open,
  onOpenChange,
  trade,
  projectTitle,
  locale = "en",
  onSent,
}: TradeSendEmailDialogProps) {
  const { toast } = useToast()
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open && trade) {
      setTo(trade.subcontractor_email ?? "")
      const scopeLink = getTradeScopeLink(trade, locale)
      setSubject(defaultEmailSubject(projectTitle, trade.trade_type))
      setBody(defaultEmailBody(trade.subcontractor_name, projectTitle, scopeLink))
    }
  }, [open, trade, projectTitle, locale])

  const handleSubmit = async () => {
    const toTrim = to.trim()
    if (!toTrim) {
      toast({ title: "Enter email", description: "Please enter the subcontractor's email address.", variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toTrim)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const scopeLink = getTradeScopeLink(trade!, locale)
      const bodyHtml = buildScopeEmailHtml(
        trade!.subcontractor_name,
        projectTitle,
        scopeLink,
        body.trim() || undefined
      )
      await api.gmailSend({
        to: toTrim,
        subject: subject.trim() || defaultEmailSubject(projectTitle, trade?.trade_type ?? "Scope"),
        body_html: bodyHtml,
        body_plain: body.trim() || defaultEmailBody(trade!.subcontractor_name, projectTitle, scopeLink),
      })
      toast({ title: "Email sent", description: `Scope link sent to ${toTrim}.` })
      onOpenChange(false)
      onSent?.()
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err?.message ?? "Failed to send email. Is Gmail connected in Settings?",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (!trade) return null

  const scopeLink = getTradeScopeLink(trade, locale)
  const firstName = (trade.subcontractor_name ?? "").trim().split(/\s+/)[0] || "there"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle>Send scope via email</DialogTitle>
          <DialogDescription>
            Send the scope link to {trade.subcontractor_name}. Email will be sent from your connected Gmail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-0 border-t">
          {/* From */}
          <div className="flex items-center gap-3 py-3 border-b px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0">From</span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserCircle className="h-5 w-5" />
              </div>
              <span className="truncate text-sm font-medium text-muted-foreground">Your connected Gmail</span>
            </div>
          </div>

          {/* To */}
          <div className="flex items-start gap-3 py-3 border-b px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0 pt-2.5">To</span>
            <div className="min-w-0 flex-1">
              <Input
                id="trade-email-to"
                type="email"
                placeholder="subcontractor@example.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-h-11 w-full px-3 py-2.5 text-base border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3 py-3 border-b px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0">Subject</span>
            <Input
              id="trade-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="min-h-9 flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0"
            />
          </div>

          {/* Message */}
          <div className="flex gap-3 py-3 px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0 pt-2.5">Message</span>
            <Textarea
              id="trade-email-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-w-0 flex-1 resize-y rounded-md border border-input bg-background"
              placeholder="Message body..."
            />
          </div>

          {/* Preview: what they'll receive + view link */}
          <div className="rounded-lg border bg-muted/30 p-3 mx-1 mt-2">
            <p className="text-xs text-muted-foreground mb-2">What the subcontractor will receive</p>
            <div className="rounded-md border bg-background p-3 text-left space-y-2">
              <p className="text-sm text-muted-foreground">
                Hi{firstName && firstName !== "there" ? ` ${firstName}` : ""},
              </p>
              <p className="text-sm text-muted-foreground">
                Your scope for &quot;{projectTitle}&quot; is ready. You can view details and accept it here:
              </p>
              <div className="py-1">
                <a
                  href={scopeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View scope here
                </a>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={sending || !to.trim()}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <SendIcon className="mr-2 h-4 w-4" />
            Send email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----- Send via SMS -----

interface TradeSendSmsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: ProjectTrade | null
  projectTitle: string
  spId: number | null
  locale?: string
  onSent?: () => void
}

export function TradeSendSmsDialog({
  open,
  onOpenChange,
  trade,
  projectTitle,
  spId,
  locale = "en",
  onSent,
}: TradeSendSmsDialogProps) {
  const { toast } = useToast()
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open && trade) {
      const scopeLink = getTradeScopeLink(trade, locale)
      setMessageText(defaultSmsMessage(trade.subcontractor_name, projectTitle, scopeLink))
    }
  }, [open, trade, projectTitle, locale])

  const handleSubmit = async () => {
    if (!trade?.contact_info?.trim()) {
      toast({ title: "No phone number", description: "Add a phone number for this subcontractor to send SMS.", variant: "destructive" })
      return
    }
    if (!spId) {
      toast({ title: "SMS not available", description: "Connect Contractor AI in Settings → Integrations to send SMS.", variant: "destructive" })
      return
    }
    if (!messageText.trim()) return
    setSending(true)
    try {
      await contractorAI.sendImmediateSms({
        sp_id: spId,
        customer_number: trade.contact_info.trim(),
        message_text: messageText.trim(),
        reference_type: "project_trade",
        reference_id: trade.id,
      })
      toast({ title: "SMS sent", description: "Scope link sent to subcontractor." })
      onOpenChange(false)
      onSent?.()
    } catch (err: any) {
      toast({ title: "Send failed", description: err?.message ?? "Failed to send SMS.", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  if (!trade) return null

  const hasPhone = Boolean(trade.contact_info?.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send scope via SMS</DialogTitle>
          <DialogDescription>
            {hasPhone
              ? `Send the scope link to ${trade.subcontractor_name} at ${trade.contact_info}.`
              : `No phone number for ${trade.subcontractor_name}. Add one in the trade details to send SMS.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="trade-sms-message">Message</Label>
            <Textarea
              id="trade-sms-message"
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Message to subcontractor..."
              maxLength={500}
              disabled={!hasPhone}
            />
            <p className="text-xs text-muted-foreground">{messageText.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={sending || !messageText.trim() || !hasPhone || !spId}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <SendIcon className="mr-2 h-4 w-4" />
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
