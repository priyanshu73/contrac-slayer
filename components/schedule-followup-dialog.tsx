"use client"

import { useState } from "react"
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
import { CalendarIcon, ClockIcon, SendIcon, InfoIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ScheduleFollowupRequest } from "@/lib/types/followup"
import { contractorAI } from "@/lib/api"

interface ScheduleFollowupDialogProps {
  contractorId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
}

// Mock customers for the demo
const mockCustomers = [
  { id: 1, name: "John Smith", phone: "+15551234567" },
  { id: 2, name: "Sarah Johnson", phone: "+15559876543" },
  { id: 3, name: "Mike Davis", phone: "+15555555555" },
  { id: 4, name: "Emily Wilson", phone: "+15554443333" },
  { id: 5, name: "David Brown", phone: "+15556667777" },
]

const templates = [
  {
    id: "appointment",
    name: "Appointment Reminder",
    template: "Hi {customer_name}! This is a reminder about your appointment tomorrow at {time}. Looking forward to seeing you!",
  },
  {
    id: "quote",
    name: "Quote Follow-up",
    template: "Hi {customer_name}, just following up on the quote we sent. Do you have any questions?",
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
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [messageText, setMessageText] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  )

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setMessageText(template.template)
    }
  }

  const handleSubmit = async () => {
    if (!contractorId || !selectedCustomer || !messageText || !selectedDate || !selectedTime) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const scheduledDateTime = new Date(selectedDate)
      scheduledDateTime.setHours(hours, minutes, 0, 0)

      const customer = mockCustomers.find(c => c.id.toString() === selectedCustomer)

      await contractorAI.scheduleFollowup({
        sp_id: contractorId,
        customer_number: customer?.phone || "",
        scheduled_for: scheduledDateTime.toISOString(),
        message_text: messageText,
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
      setSelectedCustomer("")
      setSelectedTemplate("")
      setMessageText("")
      setSelectedDate(undefined)
      setSelectedTime("09:00")
      setSearchQuery("")
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
            Send a follow-up message to a customer at a specific time
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
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <span>Use variables: {"{customer_name}"}, {"{time}"}, {"{date}"}</span>
              <span className={characterCount > maxCharacters * 0.9 ? "text-orange-500" : ""}>
                {characterCount}/{maxCharacters}
              </span>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
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
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
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

          {/* Preview */}
          {selectedDate && selectedTime && (
            <div className="rounded-lg border border-muted bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Preview</p>
              <p className="text-sm text-muted-foreground">
                This message will be sent on{" "}
                <span className="font-medium text-foreground">
                  {format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
                </span>
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
