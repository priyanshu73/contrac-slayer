"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, SaveIcon, Loader2Icon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import {
  type FollowupSettings as FollowupSettingsType,
  mockFollowupSettings,
} from "@/lib/types/followup"
import { contractorAI } from "@/lib/api"

interface FollowupSettingsProps {
  contractorId?: number
}

export function FollowupSettings({ contractorId }: FollowupSettingsProps) {
  const t = useTranslations("messaging.settings")
  const [settings, setSettings] = useState<FollowupSettingsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [spNotFound, setSpNotFound] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      if (!contractorId) {
        setIsLoading(false)
        setSpNotFound(false)
        return
      }

      try {
        setIsLoading(true)
        setSpNotFound(false)
        const data = await contractorAI.getFollowupSettings(contractorId.toString()) as
          { settings?: FollowupSettingsType } | FollowupSettingsType
        const resolved =
          data && typeof data === "object" && "settings" in data
            ? (data as { settings?: FollowupSettingsType }).settings ?? data
            : data
        setSettings(resolved as FollowupSettingsType)
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.toLowerCase().includes("service provider not found")) {
          setSettings(null)
          setSpNotFound(true)
        } else {
          toast({
            title: t("error"),
            description: message || t("loadFailedShort"),
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [contractorId, toast])

  const handleSave = async () => {
    if (!contractorId || !settings) return
    
    setIsSaving(true)
    
    try {
      await contractorAI.updateFollowupSettings(contractorId.toString(), settings)
      toast({
        title: t("saveSuccessTitle"),
        description: t("saveSuccess"),
      })
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("saveFailed"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof FollowupSettingsType>(
    key: K,
    value: FollowupSettingsType[K]
  ) => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contractorId || spNotFound) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          {spNotFound ? t("spNotFound") : t("spRequired")}
        </AlertDescription>
      </Alert>
    )
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("loadFailed")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>{t("intro")}</AlertDescription>
      </Alert>

      {/* Master Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">{t("enableAutomatic")}</Label>
            <p className="text-sm text-muted-foreground">{t("enableAutomaticDesc")}</p>
          </div>
          <Switch
            checked={settings.automatic_followup_enabled}
            onCheckedChange={(checked) => updateSetting('automatic_followup_enabled', checked)}
          />
        </div>
      </Card>

      {/* Appointment Reminders */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("appointmentReminders")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("appointmentRemindersDesc")}</p>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="days-before">{t("daysBefore")}</Label>
              <Input
                id="days-before"
                type="number"
                min="0"
                max="30"
                value={settings.followup_days_before_appointment}
                onChange={(e) => updateSetting('followup_days_before_appointment', parseInt(e.target.value) || 0)}
                disabled={!settings.automatic_followup_enabled}
              />
              <p className="text-xs text-muted-foreground">{t("daysBeforeHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours-before">{t("hoursBefore")}</Label>
              <Input
                id="hours-before"
                type="number"
                min="0"
                max="72"
                value={settings.followup_hours_before_appointment}
                onChange={(e) => updateSetting('followup_hours_before_appointment', parseInt(e.target.value) || 0)}
                disabled={!settings.automatic_followup_enabled}
              />
              <p className="text-xs text-muted-foreground">{t("hoursBeforeHint")}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="template-1day">{t("template1day")}</Label>
            <Textarea
              id="template-1day"
              rows={3}
              value={settings.reminder_1day_template}
              onChange={(e) => updateSetting('reminder_1day_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder={t("template1dayPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("availableVariables")} <code className="text-xs">{"{customer_name}"}</code>,{" "}
              <code className="text-xs">{"{time}"}</code>,{" "}
              <code className="text-xs">{"{date}"}</code>,{" "}
              <code className="text-xs">{"{datetime}"}</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-1hour">{t("template1hour")}</Label>
            <Textarea
              id="template-1hour"
              rows={3}
              value={settings.reminder_1hour_template}
              onChange={(e) => updateSetting('reminder_1hour_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder={t("template1hourPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("availableVariables")} <code className="text-xs">{"{customer_name}"}</code>,{" "}
              <code className="text-xs">{"{time}"}</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Quote Follow-ups */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t("quoteFollowups")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("quoteFollowupsDesc")}</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="days-after-quote">{t("daysAfterQuote")}</Label>
            <Input
              id="days-after-quote"
              type="number"
              min="0"
              max="90"
              value={settings.followup_days_after_quote || 3}
              onChange={(e) => updateSetting('followup_days_after_quote', parseInt(e.target.value) || 0)}
              disabled={!settings.automatic_followup_enabled}
            />
            <p className="text-xs text-muted-foreground">{t("daysAfterQuoteHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-quote">{t("quoteTemplate")}</Label>
            <Textarea
              id="template-quote"
              rows={3}
              value={settings.quote_followup_template}
              onChange={(e) => updateSetting('quote_followup_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder={t("quoteTemplatePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("availableVariables")} <code className="text-xs">{"{customer_name}"}</code>,{" "}
              <code className="text-xs">{"{quote_link}"}</code>,{" "}
              <code className="text-xs">{"{quote_amount}"}</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2 sticky bottom-0 bg-background pt-4 pb-4">
        <Button onClick={handleSave} disabled={isSaving}>
          <SaveIcon className="mr-2 h-4 w-4" />
          {isSaving ? t("saving") : t("saveChanges")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSettings(mockFollowupSettings)}
          disabled={isSaving}
        >
          {t("resetToDefaults")}
        </Button>
      </div>
    </div>
  )
}
