/**
 * Workflow runs: a drafted packet of work the contractor reviews and approves.
 * Mirrors app/schemas/workflow.py in ContractorBackend.
 */

export type WorkflowRunStatus =
  | "DRAFTING"
  | "AWAITING_REVIEW"
  | "APPLYING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED"

export type WorkflowStepStatus =
  | "PENDING"
  | "PROPOSED"
  | "EDITED"
  | "SKIPPED"
  | "BLOCKED"
  | "APPLIED"
  | "FAILED"

export type WorkflowTrigger = "EVENT" | "MANUAL" | "CHAT"

export interface WorkflowBlocker {
  code: string
  message: string
}

export interface WorkflowStep {
  key: string
  position: number
  depends_on: string[]
  status: WorkflowStepStatus
  proposal: Record<string, any> | null
  proposal_original: Record<string, any> | null
  result: Record<string, any> | null
  blockers: WorkflowBlocker[]
  error: string | null
  drafted_at: string | null
  applied_at: string | null
}

export interface WorkflowEvent {
  event_type: string
  step_key: string | null
  summary: string
  details: Record<string, any> | null
  created_at: string
}

export interface WorkflowProgress {
  phase?: string
  step?: string | null
  steps_done?: number
  steps_total?: number
  message?: string
}

export interface WorkflowRun {
  uuid: string
  kind: string
  status: WorkflowRunStatus
  awaiting_checkpoint: string | null
  failed_phase: string | null
  trigger: WorkflowTrigger
  trigger_ref_kind: string
  trigger_ref_id: string
  job_progress: WorkflowProgress | null
  summary: string | null
  error: string | null
  reviewed_at: string | null
  drafted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string | null
}

export interface WorkflowRunDetail extends WorkflowRun {
  context: Record<string, any>
  steps: WorkflowStep[]
  events: WorkflowEvent[]
}

export interface WorkflowRunCreate {
  kind: string
  trigger_ref_kind: string
  trigger_ref_id: string
  context?: Record<string, any>
}

export interface WorkflowActionResponse {
  run: WorkflowRun
  message: string
}

export const WORKFLOW_KIND_LABEL: Record<string, string> = {
  lead_to_quote: "Lead to quote",
  noop: "Test workflow",
}

export const WORKFLOW_STEP_LABEL: Record<string, string> = {
  client: "Client",
  project: "Project",
  estimate: "Estimate",
  quote: "Quote",
  email: "Email",
}
