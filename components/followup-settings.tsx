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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  InfoIcon,
  SaveIcon,
  Loader2Icon,
  CalendarClockIcon,
  FileTextIcon,
  ChevronDownIcon,
  MessageSquareIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
  const t = useTranslations("scheduling.settings")
  const [settings, setSettings] = useState<FollowupSettingsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [spNotFound, setSpNotFound] = useState(false)
  const [appointmentTemplatesOpen, setAppointmentTemplatesOpen] = useState(false)
  const [quoteTemplateOpen, setQuoteTemplateOpen] = useState(false)
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

  const enabled = settings.automatic_followup_enabled
  const variablesHint = (vars: string[]) => (
    <p className="text-xs text-muted-foreground">
      {t("availableVariables")}{" "}
      {vars.map((v, i) => (
        <span key={v}>
          {i > 0 && ", "}
          <code className="text-xs">{`{${v}}`}</code>
        </span>
      ))}
    </p>
  )

  return (
    <div className="space-y-4">
      {/* Master switch */}
      <Card className="gap-0 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">{t("autoFollowups")}</Label>
            <p className="text-sm text-muted-foreground">{t("autoFollowupsDesc")}</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => updateSetting("automatic_followup_enabled", checked)}
          />
        </div>
      </Card>

      {/* Appointment reminders */}
      <Card className={cn("gap-0 p-5 transition-opacity", !enabled && "opacity-60")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClockIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">{t("appointmentReminders")}</Label>
          </div>
          {/* Per-card toggle mirrors the master switch */}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => updateSetting("automatic_followup_enabled", checked)}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="days-before" className="text-xs text-muted-foreground">
              {t("daysBeforeShort")}
            </Label>
            <Input
              id="days-before"
              type="number"
              min="0"
              max="30"
              value={settings.followup_days_before_appointment}
              onChange={(e) => updateSetting("followup_days_before_appointment", parseInt(e.target.value) || 0)}
              disabled={!enabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours-before" className="text-xs text-muted-foreground">
              {t("hoursBeforeShort")}
            </Label>
            <Input
              id="hours-before"
              type="number"
              min="0"
              max="72"
              value={settings.followup_hours_before_appointment}
              onChange={(e) => updateSetting("followup_hours_before_appointment", parseInt(e.target.value) || 0)}
              disabled={!enabled}
            />
          </div>
        </div>

        <Collapsible
          open={appointmentTemplatesOpen}
          onOpenChange={setAppointmentTemplatesOpen}
          className="mt-4"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
              {t("messageTemplates", { count: 2 })}
            </span>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                appointmentTemplatesOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="template-1day">{t("template1day")}</Label>
              <Textarea
                id="template-1day"
                rows={3}
                value={settings.reminder_1day_template}
                onChange={(e) => updateSetting("reminder_1day_template", e.target.value)}
                disabled={!enabled}
                placeholder={t("template1dayPlaceholder")}
              />
              {variablesHint(["customer_name", "time", "date", "datetime"])}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-1hour">{t("template1hour")}</Label>
              <Textarea
                id="template-1hour"
                rows={3}
                value={settings.reminder_1hour_template}
                onChange={(e) => updateSetting("reminder_1hour_template", e.target.value)}
                disabled={!enabled}
                placeholder={t("template1hourPlaceholder")}
              />
              {variablesHint(["customer_name", "time"])}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Quote follow-ups */}
      <Card className={cn("gap-0 p-5 transition-opacity", !enabled && "opacity-60")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">{t("quoteFollowups")}</Label>
          </div>
          {/* Per-card toggle mirrors the master switch */}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => updateSetting("automatic_followup_enabled", checked)}
          />
        </div>

        <div className="mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="days-after-quote" className="text-xs text-muted-foreground">
              {t("daysAfterShort")}
            </Label>
            <Input
              id="days-after-quote"
              type="number"
              min="0"
              max="90"
              value={settings.followup_days_after_quote || 3}
              onChange={(e) => updateSetting("followup_days_after_quote", parseInt(e.target.value) || 0)}
              disabled={!enabled}
            />
          </div>
        </div>

        <Collapsible
          open={quoteTemplateOpen}
          onOpenChange={setQuoteTemplateOpen}
          className="mt-4"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50">
            <span className="flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
              {t("messageTemplates", { count: 1 })}
            </span>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                quoteTemplateOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-4">
            <Label htmlFor="template-quote">{t("quoteTemplate")}</Label>
            <Textarea
              id="template-quote"
              rows={3}
              value={settings.quote_followup_template}
              onChange={(e) => updateSetting("quote_followup_template", e.target.value)}
              disabled={!enabled}
              placeholder={t("quoteTemplatePlaceholder")}
            />
            {variablesHint(["customer_name", "quote_link", "quote_amount"])}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Separator />

      {/* Save actions */}
      <div className="flex flex-wrap gap-2">
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
