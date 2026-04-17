import type { CampaignExecutionMode, CampaignPayload } from "@/lib/types"

export type SegmentForm = {
  type: string
  customLabel?: string
}

export type ChannelType = "email" | "sms"

export type CampaignFormState = {
  name: string
  executionMode: CampaignExecutionMode
  addressLabel: string
  formattedAddress: string
  city: string
  state: string
  postalCode: string
  lat: number | null
  lng: number | null
  radiusMiles: number
  preferredChannel: "email" | "phone"
  emailEnabled: boolean
  smsEnabled: boolean
  emailInstructions: string
  segments: SegmentForm[]
}

export const DEFAULT_DAILY_LIMIT = 20
export const DEFAULT_TOTAL_LEADS_TARGET = 150

export const INITIAL_FORM: CampaignFormState = {
  name: "",
  executionMode: "REVIEW",
  addressLabel: "",
  formattedAddress: "",
  city: "",
  state: "",
  postalCode: "",
  lat: null,
  lng: null,
  radiusMiles: 15,
  preferredChannel: "email",
  emailEnabled: true,
  smsEnabled: false,
  emailInstructions: "",
  segments: [{ type: "property_manager" }],
}

export function buildPayload(form: CampaignFormState): CampaignPayload {
  return {
    name: form.name.trim(),
    location: {
      formatted_address: form.formattedAddress.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      postal_code: form.postalCode.trim(),
      lat: form.lat,
      lng: form.lng,
      radius_miles: form.radiusMiles,
    },
    segments: form.segments
      .map((segment, index) => ({
        type: segment.type === "custom" ? (segment.customLabel?.trim() || "custom") : segment.type,
        priority: Math.max(1, 10 - index),
      }))
      .filter((segment) => segment.type.trim().length > 0),
    settings: {
      channels: {
        email: form.emailEnabled,
        sms: form.smsEnabled,
      },
      preferred_channel: form.preferredChannel,
    },
    email_instructions: form.emailInstructions.trim() || undefined,
    start_date: null,
    end_date: null,
    daily_limit: DEFAULT_DAILY_LIMIT,
    total_leads_target: DEFAULT_TOTAL_LEADS_TARGET,
    execution_mode: form.executionMode,
  }
}
