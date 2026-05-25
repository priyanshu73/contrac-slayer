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
  operator_display_name: string | null
  operator_voice_id: string | null
  initial_setup_done: boolean
  business_display_name: string | null
  receptionist_system_prompt: string | null
  setup_preview_json: Record<string, unknown> | null
  setup_completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface FrontlineSetupPreview {
  business_display_name: string
  business_snapshot: Record<string, string>
  receptionist_brief: string
  receptionist_system_prompt: string
  starter_knowledge_markdown?: string
  operator_display_name?: string
  operator_voice_id?: string
  source_context?: Record<string, unknown>
}

export interface FrontlineSetupContextResponse {
  initial_setup_done: boolean
  business_display_name: string | null
  setup_preview_json: FrontlineSetupPreview | null
  setup_completed_at: string | null
  has_system_prompt: boolean
  setup_available?: boolean
  context: Record<string, unknown>
}

export interface FrontlineSetupGenerateResponse {
  preview: FrontlineSetupPreview
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

export interface FrontlineVoiceTrainingEligibility {
  allowed: boolean
  weekly_limit: number | null
  completed_this_week: number
  max_seconds: number
  model_id: string
  voice_id: string
  region: string
}

export interface FrontlineVoiceTrainingSession {
  id: number
  uuid: string
  contractor_id: number
  profile_uuid: string
  sp_id: number | null
  status: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | string
  provider: string
  model_id: string
  voice_id: string
  region: string
  duration_seconds: number | null
  transcript_text: string | null
  transcript_json: Array<{ role: string; text: string; at?: string }> | null
  intake_summary: string | null
  failure_reason: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface FrontlineVoiceTrainingSessionStart {
  session: FrontlineVoiceTrainingSession
  websocket_path: string
  websocket_token?: string
  max_seconds: number
}

export interface FrontlineVoiceDemoSessionStart {
  session_uuid: string
  websocket_path: string
  websocket_token: string
  max_seconds: number
  model_id: string
  voice_id: string
  region: string
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
