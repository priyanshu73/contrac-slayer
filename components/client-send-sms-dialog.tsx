"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { contractorAI } from "@/lib/api"

interface ClientSendSmsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  spId: number
  clientName: string
  clientPhone: string
  clientId?: number
  presetMessage?: string
  onSent?: () => void
}

const PRESETS: Record<string, string> = {
  runningLate: "Hi {client_name}, we're running a few minutes late. We'll be there soon!",
  appointmentCancelled: "Hi {client_name}, we need to reschedule your appointment. Please give us a call to find a new time.",
  reschedule: "Hi {client_name}, we'd like to reschedule your appointment. Please call us to pick a new date and time.",
}

export function ClientSendSmsDialog({
  open,
  onOpenChange,
  spId,
  clientName,
  clientPhone,
  clientId,
  presetMessage,
  onSent,
}: ClientSendSmsDialogProps) {
  const t = useTranslations("clientCommunications")
  const { toast } = useToast()
  const [messageText, setMessageText] = useState(presetMessage ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePreset = (key: keyof typeof PRESETS) => {
    const text = PRESETS[key].replace(/\{client_name\}/g, clientName || "there")
    setMessageText(text)
  }

  const handleSubmit = async () => {
    if (!messageText.trim()) {
      return
    }
    setIsSubmitting(true)
    try {
      await contractorAI.sendImmediateSms({
        sp_id: spId,
        customer_number: clientPhone,
        message_text: messageText.trim(),
        reference_type: "client",
        reference_id: clientId,
      })
      toast({
        title: t("smsSent"),
        description: t("smsSentDesc"),
      })
      setMessageText("")
      onOpenChange(false)
      onSent?.()
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("sendFailed"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sendSms")}</DialogTitle>
          <DialogDescription>{t("sendSmsDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("quickPresets")}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("runningLate")}
              >
                {t("presetRunningLate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("appointmentCancelled")}
              >
                {t("presetCancelled")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePreset("reschedule")}
              >
                {t("presetReschedule")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-sms-message">{t("message")}</Label>
            <Textarea
              id="client-sms-message"
              rows={4}
              placeholder={t("messagePlaceholder")}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {messageText.length}/500
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!messageText.trim() || isSubmitting}>
            <SendIcon className="mr-2 h-4 w-4" />
            {isSubmitting ? t("sending") : t("sendNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
