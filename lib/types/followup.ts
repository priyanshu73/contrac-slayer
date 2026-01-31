/**
 * TypeScript types for the follow-up/reminder system
 */

export type FollowupType = 'appointment_1day' | 'appointment_1hour' | 'quote' | 'custom'
export type FollowupStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export interface FollowupSettings {
  id: number
  sp_id: number
  automatic_followup_enabled: boolean
  followup_days_before_appointment: number
  followup_hours_before_appointment: number
  followup_days_after_contact?: number
  followup_days_after_quote?: number
  followup_days_after_job?: number
  reminder_1day_template: string
  reminder_1hour_template: string
  quote_followup_template: string
  created_at: string
  updated_at: string
}

export interface ScheduledFollowup {
  id: number
  sp_id: number
  customer_name: string
  customer_number: string
  scheduled_for: string
  followup_type: FollowupType
  message_text: string
  status: FollowupStatus
  sent_at?: string
  twilio_message_sid?: string
  error_message?: string
  reference_type?: string
  reference_id?: number
  appointment_datetime?: string
  created_at: string
  updated_at: string
}

export interface ScheduleFollowupRequest {
  sp_id: number
  customer_number: string
  customer_name: string
  scheduled_for: string
  message_text: string
  appointment_datetime?: string
  reference_type?: string
  reference_id?: number
}

// Mock data for development
export const mockFollowupSettings: FollowupSettings = {
  id: 1,
  sp_id: 1,
  automatic_followup_enabled: true,
  followup_days_before_appointment: 1,
  followup_hours_before_appointment: 1,
  followup_days_after_contact: 3,
  followup_days_after_quote: 3,
  followup_days_after_job: 7,
  reminder_1day_template: "Hi {customer_name}! This is a reminder about your appointment tomorrow at {time}. Looking forward to seeing you!",
  reminder_1hour_template: "Hi {customer_name}! Your appointment is in 1 hour at {time}. See you soon!",
  quote_followup_template: "Hi {customer_name}, just following up on the quote we sent. Do you have any questions? {quote_link}",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockScheduledFollowups: ScheduledFollowup[] = [
  {
    id: 1,
    sp_id: 1,
    customer_name: "John Smith",
    customer_number: "+15551234567",
    scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    followup_type: "appointment_1day",
    message_text: "Hi John! This is a reminder about your appointment tomorrow at 2:00 PM. Looking forward to seeing you!",
    status: "pending",
    reference_type: "appointment",
    reference_id: 123,
    appointment_datetime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    sp_id: 1,
    customer_name: "Sarah Johnson",
    customer_number: "+15559876543",
    scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    followup_type: "quote",
    message_text: "Hi Sarah, just following up on the quote we sent. Do you have any questions?",
    status: "pending",
    reference_type: "quote",
    reference_id: 456,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    sp_id: 1,
    customer_name: "Emily Wilson",
    customer_number: "+15554443333",
    scheduled_for: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    followup_type: "custom",
    message_text: "Hi Emily, checking in to see if you're still interested in our services.",
    status: "failed",
    error_message: "Invalid phone number",
    reference_type: "lead",
    reference_id: 999,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
