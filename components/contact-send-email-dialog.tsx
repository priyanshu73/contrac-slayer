"use client"

import { useEffect, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br />")
}

function splitRecipients(value: string): string[] {
  return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)
}

function uniqueRecipients(value: string | string[]): string[] {
  const recipients = Array.isArray(value) ? value : splitRecipients(value)
  return recipients.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index
  )
}

function RecipientField({
  label,
  recipients,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
  firstRecipientName,
}: {
  label: string
  recipients: string[]
  draft: string
  onDraftChange: (value: string) => void
  onAdd: () => void
  onRemove: (email: string) => void
  firstRecipientName?: string | null
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "Tab", ",", ";"].includes(event.key) && draft.trim()) {
      event.preventDefault()
      onAdd()
    }
    if (event.key === "Backspace" && !draft && recipients.length) {
      onRemove(recipients[recipients.length - 1])
    }
  }

  return (
    <div className="grid grid-cols-[42px_1fr] items-start gap-2">
      <Label className="pt-2.5 text-muted-foreground">{label}</Label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring">
        {recipients.map((email) => (
          <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
            <span className="truncate">
              {firstRecipientName && email === recipients[0] ? `${firstRecipientName} · ${email}` : email}
            </span>
            <button
              type="button"
              onClick={() => onRemove(email)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${email}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onAdd}
          className="h-7 min-w-[150px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={recipients.length ? "Add recipient" : "name@example.com"}
          inputMode="email"
        />
      </div>
    </div>
  )
}

export function ContactSendEmailDialog({
  open,
  onOpenChange,
  to,
  recipientName,
  initialSubject = "Following up",
  initialBody = "",
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  to: string | string[]
  recipientName?: string | null
  initialSubject?: string
  initialBody?: string
  onSent?: () => void
}) {
  const { toast } = useToast()
  const [toRecipients, setToRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [bccRecipients, setBccRecipients] = useState<string[]>([])
  const [toDraft, setToDraft] = useState("")
  const [ccDraft, setCcDraft] = useState("")
  const [bccDraft, setBccDraft] = useState("")
  const [showCopies, setShowCopies] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setToRecipients(uniqueRecipients(to))
    setCcRecipients([])
    setBccRecipients([])
    setToDraft("")
    setCcDraft("")
    setBccDraft("")
    setShowCopies(false)
    setSubject(initialSubject)
    setBody(initialBody)
    setConnected(null)
    api.getGmailStatus()
      .then((status) => setConnected(status.connected))
      .catch(() => setConnected(false))
  }, [initialBody, initialSubject, open, to])

  const addRecipients = (
    draft: string,
    setDraft: (value: string) => void,
    recipients: string[],
    setRecipients: (value: string[]) => void,
  ) => {
    const additions = splitRecipients(draft)
    if (!additions.length) return
    setRecipients(uniqueRecipients([...recipients, ...additions]))
    setDraft("")
  }

  const send = async () => {
    const finalTo = uniqueRecipients([...toRecipients, ...splitRecipients(toDraft)])
    const finalCc = uniqueRecipients([...ccRecipients, ...splitRecipients(ccDraft)])
    const finalBcc = uniqueRecipients([...bccRecipients, ...splitRecipients(bccDraft)])
    const invalid = [...finalTo, ...finalCc, ...finalBcc].find((email) => !EMAIL_PATTERN.test(email))
    if (invalid) {
      toast({ title: "Invalid recipient", description: `${invalid} is not a valid email address.`, variant: "destructive" })
      return
    }
    if (!finalTo.length || !subject.trim() || !body.trim()) return
    setSending(true)
    try {
      await api.gmailSend({
        to: finalTo,
        cc: finalCc,
        bcc: finalBcc,
        subject: subject.trim(),
        body_plain: body.trim(),
        body_html: `<p>${escapeHtml(body.trim())}</p>`,
      })
      toast({
        title: "Email sent",
        description: `Sent to ${finalTo.length} recipient${finalTo.length === 1 ? "" : "s"} from your connected Google account.`,
      })
      onOpenChange(false)
      onSent?.()
    } catch (error) {
      toast({
        title: "Email not sent",
        description: error instanceof Error ? error.message : "Could not send this email.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const field = (
    label: string,
    recipients: string[],
    setRecipients: (value: string[]) => void,
    draft: string,
    setDraft: (value: string) => void,
    firstRecipientName?: string | null,
  ) => (
    <RecipientField
      label={label}
      recipients={recipients}
      draft={draft}
      onDraftChange={setDraft}
      onAdd={() => addRecipients(draft, setDraft, recipients, setRecipients)}
      onRemove={(email) => setRecipients(recipients.filter((item) => item !== email))}
      firstRecipientName={firstRecipientName}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>Email is sent directly from your connected Google account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCopies((value) => !value)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {showCopies ? "Hide Cc/Bcc" : "Cc/Bcc"}
              </button>
            </div>
            {field("To", toRecipients, setToRecipients, toDraft, setToDraft, recipientName)}
            {showCopies && (
              <>
                {field("Cc", ccRecipients, setCcRecipients, ccDraft, setCcDraft)}
                {field("Bcc", bccRecipients, setBccRecipients, bccDraft, setBccDraft)}
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email-subject">Subject</Label>
            <Input id="contact-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email-body">Message</Label>
            <Textarea
              id="contact-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              placeholder="Write a message…"
            />
          </div>
          {connected === false && (
            <p className="text-sm text-destructive">
              Google is not connected. Connect it in Settings → Integrations before sending email.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button
            onClick={send}
            disabled={sending || connected !== true || (!toRecipients.length && !toDraft.trim()) || !subject.trim() || !body.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Keeps the caller's existing button/link layout while opening the shared composer. */
export function ContactSendEmailTrigger({
  children,
  ...dialogProps
}: Omit<ComponentProps<typeof ContactSendEmailDialog>, "open" | "onOpenChange"> & {
  children: (open: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {children(() => setOpen(true))}
      <ContactSendEmailDialog {...dialogProps} open={open} onOpenChange={setOpen} />
    </>
  )
}
