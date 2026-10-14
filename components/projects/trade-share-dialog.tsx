"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
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
import { api } from "@/lib/api"
import type { ProjectTrade } from "@/lib/types"

function getTradeScopeLink(trade: ProjectTrade, locale = "en"): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/${locale}/projects/trade/${trade.uuid}`
}

type Translator = (key: string, values?: Record<string, string | number>) => string

const defaultEmailSubject = (t: Translator, projectTitle: string, tradeType: string) =>
  t("emailSubject", { trade: tradeType, project: projectTitle })

const defaultEmailBody = (t: Translator, subcontractorName: string, projectTitle: string, scopeLink: string) =>
  t("emailBody", { name: subcontractorName, project: projectTitle, link: scopeLink })

const defaultSmsMessage = (t: Translator, subcontractorName: string, projectTitle: string, scopeLink: string) =>
  t("smsBody", { name: subcontractorName, project: projectTitle, link: scopeLink })

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
  const t = useTranslations("projectsPage.tradeShare")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open && trade) {
      setTo(trade.subcontractor_email ?? "")
      const scopeLink = getTradeScopeLink(trade, locale)
      setSubject(defaultEmailSubject(t, projectTitle, trade.trade_type))
      setBody(defaultEmailBody(t, trade.subcontractor_name, projectTitle, scopeLink))
    }
  }, [open, trade, projectTitle, locale, t])

  const handleSubmit = async () => {
    const toTrim = to.trim()
    if (!toTrim) {
      toast({ title: t("enterEmail"), description: t("enterEmailDesc"), variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toTrim)) {
      toast({ title: t("invalidEmail"), description: t("invalidEmailDesc"), variant: "destructive" })
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
        subject: subject.trim() || defaultEmailSubject(t, projectTitle, trade?.trade_type ?? t("scope")),
        body_html: bodyHtml,
        body_plain: body.trim() || defaultEmailBody(t, trade!.subcontractor_name, projectTitle, scopeLink),
      })
      toast({ title: t("emailSent"), description: t("emailSentDesc", { email: toTrim }) })
      onOpenChange(false)
      onSent?.()
    } catch (err: any) {
      toast({
        title: t("sendFailed"),
        description: err?.message ?? t("emailFailedDesc"),
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
          <DialogTitle>{t("emailTitle")}</DialogTitle>
          <DialogDescription>
            {t("emailDesc", { name: trade.subcontractor_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-0 border-t">
          {/* From */}
          <div className="flex items-center gap-3 py-3 border-b px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0">{t("from")}</span>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserCircle className="h-5 w-5" />
              </div>
              <span className="truncate text-sm font-medium text-muted-foreground">{t("connectedGmail")}</span>
            </div>
          </div>

          {/* To */}
          <div className="flex items-start gap-3 py-3 border-b px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0 pt-2.5">{t("to")}</span>
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
            <span className="text-muted-foreground text-sm w-14 shrink-0">{t("subject")}</span>
            <Input
              id="trade-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subject")}
              className="min-h-9 flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0"
            />
          </div>

          {/* Message */}
          <div className="flex gap-3 py-3 px-1">
            <span className="text-muted-foreground text-sm w-14 shrink-0 pt-2.5">{t("message")}</span>
            <Textarea
              id="trade-email-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-w-0 flex-1 resize-y rounded-md border border-input bg-background"
              placeholder={t("messageBodyPlaceholder")}
            />
          </div>

          {/* Preview: what they'll receive + view link */}
          <div className="rounded-lg border bg-muted/30 p-3 mx-1 mt-2">
            <p className="text-xs text-muted-foreground mb-2">{t("willReceive")}</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={sending || !to.trim()}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <SendIcon className="mr-2 h-4 w-4" />
            {t("sendEmail")}
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
  const t = useTranslations("projectsPage.tradeShare")
  const [messageText, setMessageText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open && trade) {
      const scopeLink = getTradeScopeLink(trade, locale)
      setMessageText(defaultSmsMessage(t, trade.subcontractor_name, projectTitle, scopeLink))
    }
  }, [open, trade, projectTitle, locale, t])

  const handleSubmit = async () => {
    if (!trade?.contact_info?.trim()) {
      toast({ title: t("noPhone"), description: t("noPhoneDesc"), variant: "destructive" })
      return
    }
    if (!spId) {
      toast({ title: t("smsUnavailable"), description: t("smsUnavailableDesc"), variant: "destructive" })
      return
    }
    if (!messageText.trim()) return
    setSending(true)
    try {
      await api.sendFollowupNow({
        customer_number: trade.contact_info.trim(),
        message_text: messageText.trim(),
        reference_type: "project_trade",
        reference_id: trade.id,
      })
      toast({ title: t("smsSent"), description: t("smsSentDesc") })
      onOpenChange(false)
      onSent?.()
    } catch (err: any) {
      toast({ title: t("sendFailed"), description: err?.message ?? t("smsFailedDesc"), variant: "destructive" })
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
          <DialogTitle>{t("smsTitle")}</DialogTitle>
          <DialogDescription>
            {hasPhone
              ? t("smsDesc", { name: trade.subcontractor_name, phone: trade.contact_info ?? "" })
              : t("smsNoPhoneDesc", { name: trade.subcontractor_name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="trade-sms-message">{t("message")}</Label>
            <Textarea
              id="trade-sms-message"
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t("smsPlaceholder")}
              maxLength={500}
              disabled={!hasPhone}
            />
            <p className="text-xs text-muted-foreground">{messageText.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={sending || !messageText.trim() || !hasPhone || !spId}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <SendIcon className="mr-2 h-4 w-4" />
            {t("sendSms")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
