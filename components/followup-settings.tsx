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
import type { FollowupSettings as FollowupSettingsType } from "@/lib/types/followup"
import { contractorAI } from "@/lib/api"

interface FollowupSettingsProps {
  contractorId?: number
}

export function FollowupSettings({ contractorId }: FollowupSettingsProps) {
  const [settings, setSettings] = useState<FollowupSettingsType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      if (!contractorId) return
      
      try {
        setIsLoading(true)
        const data = await contractorAI.getFollowupSettings(contractorId.toString())
        setSettings(data)
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load follow-up settings",
          variant: "destructive",
        })
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
        title: "Settings saved",
        description: "Your follow-up settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
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

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load follow-up settings. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure automatic follow-ups to send reminders to your customers via SMS. 
          Customize timing and message templates for different types of follow-ups.
        </AlertDescription>
      </Alert>

      {/* Master Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Automatic Follow-ups</Label>
            <p className="text-sm text-muted-foreground">
              Automatically send follow-up messages based on your configured settings
            </p>
          </div>
          <Switch
            checked={settings.automatic_followup_enabled}
            onCheckedChange={(checked) => updateSetting('automatic_followup_enabled', checked)}
          />
        </div>
      </Card>

      {/* Appointment Reminders */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Appointment Reminders</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Send automatic reminders to customers before scheduled appointments
        </p>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="days-before">Days before appointment</Label>
              <Input
                id="days-before"
                type="number"
                min="0"
                max="30"
                value={settings.followup_days_before_appointment}
                onChange={(e) => updateSetting('followup_days_before_appointment', parseInt(e.target.value) || 0)}
                disabled={!settings.automatic_followup_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Send reminder this many days before (at 9 AM)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours-before">Hours before appointment</Label>
              <Input
                id="hours-before"
                type="number"
                min="0"
                max="72"
                value={settings.followup_hours_before_appointment}
                onChange={(e) => updateSetting('followup_hours_before_appointment', parseInt(e.target.value) || 0)}
                disabled={!settings.automatic_followup_enabled}
              />
              <p className="text-xs text-muted-foreground">
                Send reminder this many hours before
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="template-1day">1-Day Before Reminder Template</Label>
            <Textarea
              id="template-1day"
              rows={3}
              value={settings.reminder_1day_template}
              onChange={(e) => updateSetting('reminder_1day_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder="Hi {customer_name}! This is a reminder about your appointment tomorrow at {time}..."
            />
            <p className="text-xs text-muted-foreground">
              Available variables: <code className="text-xs">{"{customer_name}"}</code>,{" "}
              <code className="text-xs">{"{time}"}</code>,{" "}
              <code className="text-xs">{"{date}"}</code>,{" "}
              <code className="text-xs">{"{datetime}"}</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-1hour">1-Hour Before Reminder Template</Label>
            <Textarea
              id="template-1hour"
              rows={3}
              value={settings.reminder_1hour_template}
              onChange={(e) => updateSetting('reminder_1hour_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder="Hi {customer_name}! Your appointment is in 1 hour at {time}..."
            />
            <p className="text-xs text-muted-foreground">
              Available variables: <code className="text-xs">{"{customer_name}"}</code>,{" "}
              <code className="text-xs">{"{time}"}</code>
            </p>
          </div>
        </div>
      </Card>

      {/* Quote Follow-ups */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Quote Follow-ups</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Automatically follow up with customers who haven't responded to quotes
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="days-after-quote">Days after sending quote</Label>
            <Input
              id="days-after-quote"
              type="number"
              min="0"
              max="90"
              value={settings.followup_days_after_quote || 3}
              onChange={(e) => updateSetting('followup_days_after_quote', parseInt(e.target.value) || 0)}
              disabled={!settings.automatic_followup_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Send follow-up this many days after quote is sent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-quote">Quote Follow-up Template</Label>
            <Textarea
              id="template-quote"
              rows={3}
              value={settings.quote_followup_template}
              onChange={(e) => updateSetting('quote_followup_template', e.target.value)}
              disabled={!settings.automatic_followup_enabled}
              placeholder="Hi {customer_name}, just following up on the quote we sent..."
            />
            <p className="text-xs text-muted-foreground">
              Available variables: <code className="text-xs">{"{customer_name}"}</code>,{" "}
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
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSettings(mockFollowupSettings)}
          disabled={isSaving}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
