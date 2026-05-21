/**
 * Twilio provisioning types.
 *
 * Shape mirrors `app/services/twilio_service.py:get_available_phone_numbers`
 * in ContractorAI and the response from `/contractors/profile/twilio-available`
 * + `/contractors/profile/twilio-provision` in ContractorBackend.
 */

export interface TwilioAvailableNumber {
  phone_number: string
  friendly_name?: string | null
  locality?: string | null
  region?: string | null
  postal_code?: string | null
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface TwilioProvisionResult {
  twilio_number: string
  status: 'purchased' | 'dry_run' | 'already_provisioned' | 'failed' | 'pending'
  dry_run: boolean
  request_id?: number
}

export interface AutoReplySettings {
  message: string
  is_default: boolean
  default_template: string
  placeholders: string[]
}
