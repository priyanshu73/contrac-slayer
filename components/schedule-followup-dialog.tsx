"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CalendarIcon, ClockIcon, SendIcon, InfoIcon, ChevronsUpDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ScheduleFollowupRequest } from "@/lib/types/followup"
import { contractorAI, api } from "@/lib/api"
import type { Client } from "@/lib/types"

interface ScheduleFollowupDialogProps {
  contractorId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
}

const templates = [
  {
    id: "appointment",
    name: "Appointment Reminder",
    template: "Hi {client_name}! This is a reminder about your appointment tomorrow at {time}. Looking forward to seeing you!",
  },
  {
    id: "quote",
    name: "Quote Follow-up",
    template: "Hi {client_name}, just following up on the quote we sent. Do you have any questions?",
  },
  {
    id: "custom",
    name: "Custom Message",
    template: "",
  },
]

export function ScheduleFollowupDialog({
  contractorId,
  open,
  onOpenChange,
  onScheduled,
}: ScheduleFollowupDialogProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [messageText, setMessageText] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      const fetchClients = async () => {
        setClientsLoading(true)
        try {
          const data = await api.getClients(0, 500) as Client[] | { items?: Client[] }
          const list = Array.isArray(data) ? data : (data?.items ?? [])
          setClients(list)
        } catch {
          setClients([])
        } finally {
          setClientsLoading(false)
        }
      }
      fetchClients()
      // Default date to today when dialog opens
      setSelectedDate((prev) => prev ?? new Date())
    }
  }, [open])

  // Only show clients with a phone number (required for SMS follow-up)
  const clientsWithPhone = clients.filter((c) => c.phone && c.phone.trim() !== "")
  const selectedClientData = clientsWithPhone.find((c) => c.id.toString() === selectedClient)

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setMessageText(template.template)
    }
  }

  const handleSubmit = async () => {
    if (!contractorId || !selectedClient || !messageText || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const client = clientsWithPhone.find((c) => c.id.toString() === selectedClient)
    if (!client?.phone) {
      toast({
        title: "Invalid client",
        description: "Selected client has no phone number for SMS.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Treat date and time as browser local time; send UTC to API
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const y = selectedDate.getFullYear()
      const m = selectedDate.getMonth()
      const d = selectedDate.getDate()
      const scheduledDateTime = new Date(y, m, d, hours, minutes, 0, 0)

      if (scheduledDateTime <= new Date()) {
        toast({
          title: "Invalid time",
          description: "Please pick a date and time in the future.",
          variant: "destructive",
        })
        return
      }

      // Replace template variables with actual values before sending
      const timeStr = format(scheduledDateTime, "h:mm a")
      const dateStr = format(scheduledDateTime, "MMMM d, yyyy")
      const formattedMessage = messageText
        .replace(/\{client_name\}/g, client.name ?? "there")
        .replace(/\{time\}/g, timeStr)
        .replace(/\{date\}/g, dateStr)
        .replace(/\{datetime\}/g, `${dateStr} at ${timeStr}`)

      await contractorAI.scheduleFollowup({
        sp_id: contractorId,
        customer_number: client.phone,
        scheduled_for: scheduledDateTime.toISOString(),
        message_text: formattedMessage,
        followup_type: selectedTemplate || "custom",
      })

      toast({
        title: "Follow-up scheduled",
        description: `Message scheduled for ${format(scheduledDateTime, "MMM d, yyyy 'at' h:mm a")}`,
      })

      if (onScheduled) {
        onScheduled()
      }

      // Reset form
      setSelectedClient("")
      setSelectedTemplate("")
      setMessageText("")
      setSelectedDate(undefined)
      setSelectedTime("09:00")
      setClientComboboxOpen(false)
      setDatePopoverOpen(false)
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule follow-up",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const characterCount = messageText.length
  const maxCharacters = 500

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Custom Follow-up</DialogTitle>
          <DialogDescription>
            Send a follow-up message to a client at a specific time
          </DialogDescription>
        </DialogHeader>

        {!contractorId ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              You need a ContractorOps AI number to schedule follow-ups. Add your contact in Contractor AI admin and link it to your profile first.
            </AlertDescription>
          </Alert>
        ) : (
        <>
        <div className="space-y-4 py-4">
          {/* Client Selection - combined search + dropdown */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboboxOpen}
                  disabled={clientsLoading}
                  className="w-full justify-between font-normal"
                >
                  {clientsLoading
                    ? "Loading clients..."
                    : selectedClientData
                      ? `${selectedClientData.name}${selectedClientData.phone ? ` (${selectedClientData.phone})` : ""}`
                      : "Select a client"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>
                      {clientsWithPhone.length === 0
                        ? "No clients with phone numbers. Add a client with a phone to send follow-ups."
                        : "No clients match your search."}
                    </CommandEmpty>
                    <CommandGroup>
                      {clientsWithPhone.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={`${client.name ?? ""} ${client.phone ?? ""} ${client.email ?? ""}`}
                          onSelect={() => {
                            setSelectedClient(client.id.toString())
                            setClientComboboxOpen(false)
                          }}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{client.name}</span>
                            {client.phone && (
                              <span className="text-xs text-muted-foreground">{client.phone}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Message Template (Optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template or write custom message" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message Text */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              rows={6}
              placeholder="Enter your follow-up message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              maxLength={maxCharacters}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Use variables: {"{client_name}"}, {"{time}"}, {"{date}"}</span>
              <span className={characterCount > maxCharacters * 0.9 ? "text-orange-500" : ""}>
                {characterCount}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Date & Time Selection (browser local timezone) */}
          <div className="space-y-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setDatePopoverOpen(false)
                        }
                      }}
                      disabled={(date) => {
                        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                        const todayStart = new Date()
                        todayStart.setHours(0, 0, 0, 0)
                        return dayStart < todayStart
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Times are in your local timezone
              {typeof Intl !== "undefined" && (
                <> ({Intl.DateTimeFormat().resolvedOptions().timeZone})</>
              )}
            </p>
          </div>

          {/* Preview */}
          {selectedDate && selectedTime && (
            <div className="rounded-lg border border-muted bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Preview</p>
              <p className="text-sm text-muted-foreground">
                This message will be sent on{" "}
                <span className="font-medium text-foreground">
                  {format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
                </span>
                {typeof Intl !== "undefined" && (
                  <span className="text-muted-foreground"> ({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <SendIcon className="mr-2 h-4 w-4" />
            {isSubmitting ? "Scheduling..." : "Schedule Follow-up"}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  )
}
