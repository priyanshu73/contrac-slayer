/**
 * TypeScript types for the follow-up system (served by ContractorBackend
 * `/api/followups`, backed by contractor-ai).
 */

export type FollowupType = 'appointment_1day' | 'appointment_1hour' | 'quote' | 'custom'
export type FollowupStatus = 'pending' | 'sent' | 'failed' | 'cancelled'
/** Who caused a follow-up. */
export type FollowupSource = 'automation' | 'owner' | 'ai_agent' | 'frontline' | 'system'
/** What the carrier did with it (from the Twilio status callback). */
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed'
export type CancelReason =
  | 'customer_replied'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_closed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_passed'
  | 'owner_cancelled'
  | 'automation_disabled'
  | 'opted_out'
  | 'sequence_cancelled'

export interface QuoteStep {
  /** Days after the quote is sent. */
  day: number
  template: string
}

export interface FollowupSettings {
  id: number
  sp_id: number
  automatic_followup_enabled: boolean
  followup_days_before_appointment: number
  followup_hours_before_appointment: number
  followup_days_after_contact?: number | null
  followup_days_after_quote?: number | null
  followup_days_after_job?: number | null
  reminder_1day_template: string
  reminder_1hour_template: string
  quote_followup_template: string
  /** IANA zone the engine uses; written from the contractor profile on save. */
  timezone?: string | null
  default_send_hour: number
  quiet_hours_start: string
  quiet_hours_end: string
  /** Mon=0 .. Sun=6 */
  send_days: number[]
  quote_sequence_json: QuoteStep[] | null
  /** Effective cadence (quote_sequence_json, else the legacy single step). */
  quote_steps: QuoteStep[]
  stop_on_reply: boolean
  notify_owner_on_send: boolean
  notify_owner_on_failure: boolean
  notify_owner_on_reply: boolean
  daily_digest_enabled: boolean
  digest_hour: number
  last_digest_sent_on?: string | null
  created_at: string
  updated_at: string
}

/** Fields the settings form can send. */
export type FollowupSettingsUpdate = Partial<
  Pick<
    FollowupSettings,
    | 'automatic_followup_enabled'
    | 'followup_days_before_appointment'
    | 'followup_hours_before_appointment'
    | 'followup_days_after_quote'
    | 'reminder_1day_template'
    | 'reminder_1hour_template'
    | 'quote_followup_template'
    | 'default_send_hour'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
    | 'send_days'
    | 'quote_sequence_json'
    | 'stop_on_reply'
    | 'notify_owner_on_send'
    | 'notify_owner_on_failure'
    | 'notify_owner_on_reply'
    | 'daily_digest_enabled'
    | 'digest_hour'
  >
>

export interface FollowupSettingsResponse {
  settings: FollowupSettings
  /** Server-side defaults for "Reset to defaults". */
  defaults: Partial<FollowupSettings>
  templates?: Record<string, string>
  contractor_timezone?: string | null
}

export interface ScheduledFollowup {
  id: number
  sp_id: number
  customer_name?: string | null
  customer_number: string
  scheduled_for: string
  timezone?: string | null
  followup_type: FollowupType
  source: FollowupSource
  channel?: string
  sequence_id?: number | null
  step_number?: number | null
  total_steps?: number | null
  message_text: string
  status: FollowupStatus
  sent_at?: string | null
  twilio_message_sid?: string | null
  error_message?: string | null
  cancel_reason?: CancelReason | null
  delivery_status?: DeliveryStatus | null
  delivery_error_code?: string | null
  delivered_at?: string | null
  attempt_count?: number
  last_attempt_at?: string | null
  reference_type?: string | null
  reference_id?: number | null
  appointment_datetime?: string | null
  created_at: string
  updated_at: string
  /** Added by the backend: where to click through. */
  links?: { client?: string; quote?: string; booking?: string }
}

export type FollowupEventType =
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'retry_scheduled'
  | 'cancelled'
  | 'customer_replied'
  | 'opted_out'
  | 'owner_notified'
  | 'digest_sent'

export interface FollowupEvent {
  id: number
  followup_id?: number | null
  sequence_id?: number | null
  customer_number?: string | null
  event_type: FollowupEventType
  detail?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface FollowupSequence {
  id: number
  customer_number: string
  customer_name?: string | null
  sequence_type: string
  reference_type?: string | null
  reference_id?: number | null
  total_steps: number
  status: 'active' | 'completed' | 'cancelled'
  cancel_reason?: CancelReason | null
  created_at: string
}

export interface FollowupTimeline {
  customer_number: string
  customer_name?: string | null
  followups: ScheduledFollowup[]
  events: FollowupEvent[]
  sequences: FollowupSequence[]
}

export interface FollowupSummary {
  days: number
  total_recent: number
  by_status: { pending: number; sent: number; failed: number; cancelled: number }
  by_delivery: { delivered: number; undelivered: number }
  by_source: Partial<Record<FollowupSource | 'unknown', number>>
  by_cancel_reason: Partial<Record<CancelReason | 'unknown', number>>
  replies: number
  active_sequences: number
  next_scheduled: ScheduledFollowup | null
  recent_failures: ScheduledFollowup[]
}

export interface ScheduleFollowupRequest {
  customer_number?: string
  client_id?: number
  customer_name?: string
  /** ISO 8601. With an offset it is used as-is; naive = contractor local time. */
  scheduled_for?: string
  message_text?: string
  /** When set, the backend creates the 1-day and 1-hour appointment reminders. */
  appointment_datetime?: string
  reference_type?: string
  reference_id?: number
}

export interface SendFollowupNowRequest {
  customer_number?: string
  client_id?: number
  customer_name?: string
  message_text: string
  reference_type?: string
  reference_id?: number
}
