export type FrontlineMode = "off" | "review" | "auto"

export interface FrontlineSettings {
  id: number
  profile_uuid: string
  sp_id: number | null
  enabled: boolean
  mode: FrontlineMode
  auto_min_confidence: number
  owner_assistant_enabled: boolean
  calendar_actions_enabled: boolean
  voice_enabled: boolean
  custom_voice_enabled: boolean
  created_at: string | null
  updated_at: string | null
}

export interface FrontlineKnowledgeDoc {
  id: number
  profile_uuid: string
  sp_id: number | null
  title: string
  markdown_text: string
  version: number
  created_at: string | null
  updated_at: string | null
}

export interface FrontlineKnowledgeIntakeResponse extends FrontlineKnowledgeDoc {
  intake_summary?: string | null
}

export interface FrontlineVoiceDevStatus {
  model_id: string
  voice_id: string
  region: string
  max_seconds: number
  weekly_limit: number
  python_version: string
  python_supported: boolean
  sdk_package: string
  sdk_importable: boolean
  smithy_importable: boolean
  explicit_aws_credentials_present: boolean
  ready_for_live_stream: boolean
  notes: string[]
}

export interface FrontlineSandboxAnswer {
  answer: string
  confidence: number
  mode_recommendation: "auto" | "review" | "hold"
  escalation_reason: string | null
  sources: string[]
}

export interface FrontlineActivityEvent {
  id: number
  profile_uuid: string
  sp_id: number | null
  event_type: string
  title: string
  detail: string | null
  customer_number: string | null
  status: string | null
  created_at: string | null
}

export interface FrontlineReplyApproval {
  id: number
  profile_uuid: string
  sp_id: number
  conversation_id: number | null
  customer_number: string
  owner_number: string
  approval_number: string
  customer_message: string | null
  draft_body: string
  confidence: number | null
  status: string
  created_at: string | null
  resolved_at: string | null
}

export interface FrontlineTeachNote {
  id: number
  profile_uuid: string
  sp_id: number | null
  question: string | null
  bad_answer: string | null
  corrected_answer: string
  source: string
  created_at: string | null
}
