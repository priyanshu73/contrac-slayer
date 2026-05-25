/**
 * API client layer for backend communication
 */

import type {
  Campaign,
  CampaignDetail,
  CampaignGenerateBriefResponse,
  CampaignLaunchResponse,
  CampaignPayload,
  CampaignStagedLeadsResponse,
  ContractorProfile,
  DiscoveryForecast,
  DiscoveryForecastRequest,
  GenerateCampaignStrategiesRequest,
  GenerateCampaignStrategiesResponse,
  QBOInvoiceDetail,
  QBOProjectInvoiceDetailResponse,
  StagedLeadActionResponse,
  User,
} from './types'
import type { AutoReplySettings, TwilioAvailableNumber, TwilioProvisionResult } from './types/twilio'
import type {
  FrontlineActivityEvent,
  FrontlineKnowledgeDoc,
  FrontlineKnowledgeIntakeResponse,
  FrontlineReplyApproval,
  FrontlineSandboxAnswer,
  FrontlineSettings,
  FrontlineSetupContextResponse,
  FrontlineSetupGenerateResponse,
  FrontlineSetupPreview,
  FrontlineTeachNote,
  FrontlineVoiceDevStatus,
  FrontlineVoiceDemoSessionStart,
  FrontlineVoiceTrainingEligibility,
  FrontlineVoiceTrainingSession,
  FrontlineVoiceTrainingSessionStart,
} from './types/frontline'
import { AI_ESTIMATE_REQUEST_TIMEOUT_MS } from './ai-estimate-loading'

// ─── Scope Clarification types ─────────────────────────────────────────────

export interface ScopeQuestionOption {
  id: string
  label: string
}

export interface ScopeQuestion {
  id: string
  text: string
  type: 'multi_select' | 'free_text'
  options?: ScopeQuestionOption[]
}

export interface ScopeQuestionAnswer {
  question_id: string
  selected_options?: string[]
  free_text?: string
}

export interface ScopeClarifiedScope {
  version: number
  status: 'finalized' | 'stale' | 'skipped'
  finalized_at: string
  trigger: string
  scope_narrative: string
  scope_inclusions: string[]
  scope_exclusions: string[]
  client_priorities: string
  client_concerns: string
  known_risks: string[]
  timeline_notes: string
  open_items: string[]
  brief_hash: string
}

const DEFAULT_API_URL = 'http://localhost:4000/api'

function normalizeEnvUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, '')
  return trimmed || undefined
}

const API_URL = normalizeEnvUrl(process.env.NEXT_PUBLIC_API_URL) || DEFAULT_API_URL
const BACKEND_WS_ORIGIN = normalizeEnvUrl(process.env.NEXT_PUBLIC_BACKEND_WS_ORIGIN)?.replace(/\/+$/, '')
const CONTRACTOR_AI_API_URL = normalizeEnvUrl(process.env.NEXT_PUBLIC_CONTRACTOR_AI_API_URL)

console.log('🔧 API Configuration:')
console.log(`  Main API URL: ${API_URL}`)
console.log(`  Backend WS origin: ${BACKEND_WS_ORIGIN || '(derived from API URL)'}`)
console.log(`  Contractor AI URL: ${CONTRACTOR_AI_API_URL}`)

class ApiClient {
  private configuredBaseURL: string

  constructor(baseURL: string) {
    this.configuredBaseURL = baseURL.replace(/\/+$/, '')
  }

  private get baseURL(): string {
    return this.getBaseURL()
  }

  private getBaseURL(): string {
    if (typeof window === 'undefined') {
      return this.configuredBaseURL
    }

    // Vercel staging/prod: NEXT_PUBLIC_API_URL=/api — same-origin rewrites to backend.
    if (this.configuredBaseURL.startsWith('/')) {
      return this.configuredBaseURL
    }

    try {
      const parsed = new URL(this.configuredBaseURL)
      const configuredHost = parsed.hostname
      const browserHost = window.location.hostname

      // If the frontend is opened from another device/hostname, localhost points at
      // the viewer's machine rather than the backend host. Reuse the current hostname
      // with the configured backend port so LAN/device previews keep working.
      if (
        browserHost &&
        browserHost !== 'localhost' &&
        browserHost !== '127.0.0.1' &&
        (configuredHost === 'localhost' || configuredHost === '127.0.0.1')
      ) {
        parsed.hostname = browserHost
        return parsed.toString().replace(/\/+$/, '')
      }
    } catch {
      // Fall back to the configured URL below.
    }

    return this.configuredBaseURL
  }

  private formatApiErrorDetail(detail: unknown): string {
    if (!detail) return 'An error occurred'
    let msg: string
    if (typeof detail === 'string') {
      msg = detail
    } else if (typeof detail === 'object') {
      const maybe = detail as Record<string, any>
      if (typeof maybe.message === 'string' && maybe.message.trim()) { msg = maybe.message }
      else if (typeof maybe.error === 'string' && maybe.error.trim()) { msg = maybe.error }
      else {
        const neetocal = maybe.neetocal
        if (neetocal != null) {
          if (typeof neetocal === 'string' && neetocal.trim()) { msg = neetocal.trim() }
          else if (typeof neetocal === 'object') {
            const nc = neetocal as Record<string, any>
            if (typeof nc.error === 'string' && nc.error.trim()) { msg = nc.error }
            else if (typeof nc.message === 'string' && nc.message.trim()) { msg = nc.message }
            else { msg = 'An error occurred' }
          } else { msg = 'An error occurred' }
        } else {
          try { msg = JSON.stringify(detail) } catch { msg = 'An error occurred' }
        }
      }
    } else {
      msg = String(detail)
    }
    if (/sqlalchemy|psycopg|traceback|stacktrace|\[SQL:/i.test(msg)) {
      return 'Something went wrong. Please try again.'
    }
    return msg
  }

  /** Unauthenticated fetch for public client/quote/proposal endpoints (no session cookie). */
  private async fetchPublic<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.getBaseURL()}${endpoint}`
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    })
    if (!response.ok) {
      let parsed: any = null
      try {
        parsed = await response.json()
      } catch {
        // ignore
      }
      const detail = parsed?.detail ?? parsed?.message ?? parsed?.error
      throw new Error(this.formatApiErrorDetail(detail))
    }
    if (response.status === 204) {
      return undefined as T
    }
    return response.json()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const baseURL = this.getBaseURL()
    const url = `${baseURL}${endpoint}`

    const { timeoutMs = 90_000, ...fetchOptions } = options

    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const config: RequestInit = {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
      signal: fetchOptions.signal ?? controller.signal,
    }

    try {
      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      if (!response.ok) {
        let parsed: any = null
        try {
          parsed = await response.json()
        } catch {
          // ignore
        }
        const detail = parsed?.detail ?? parsed?.message ?? parsed?.error
        throw new Error(this.formatApiErrorDetail(detail))
      }

      if (response.status === 204) {
        return undefined as T
      }
      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle timeout/abort errors
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          const seconds = Math.round(timeoutMs / 1000)
          throw new Error(
            `Request timed out after ${seconds} seconds. Large AI estimates can take a few minutes — try again or use a shorter description.`
          )
        }
        if (error.message.includes('Failed to fetch')) {
          const configuredLocally = this.configuredBaseURL.includes('localhost:4000') || this.configuredBaseURL.includes('127.0.0.1:4000')
          const browserHost = typeof window !== 'undefined' ? window.location.hostname : ''
          const openedRemotely = Boolean(browserHost && browserHost !== 'localhost' && browserHost !== '127.0.0.1')

          if (configuredLocally && openedRemotely) {
            throw new Error(
              `Could not reach the backend API at ${baseURL}. This browser is not running on the same machine as the app's localhost backend. Set NEXT_PUBLIC_API_URL to a reachable backend URL or run the frontend on the backend host.`
            )
          }

          throw new Error(
            `Could not reach the backend API at ${baseURL}. Make sure the ContractorBackend server is running on port 4000 and that NEXT_PUBLIC_API_URL is correct.`
          )
        }
        throw error
      }
      throw new Error('Network error')
    }
  }

  async signup(email: string, password: string, full_name: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name,
        is_contractor: true,
      }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async sendOtp(email: string) {
    return this.request('/auth/sendotp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async verifyOtp(email: string, otp: string) {
    return this.request('/auth/verifyotp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
  }

  async checkEmailVerification() {
    return this.request<{ is_email_verified: boolean; email: string }>('/auth/check-email-verification')
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password: newPassword }),
    })
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  async createContractorProfile(data: any) {
    return this.request('/contractors/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getMyProfile(): Promise<ContractorProfile> {
    return this.request<ContractorProfile>('/contractors/profile')
  }

  async updateProfile(data: any) {
    return this.request('/contractors/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async updateLanguagePreference(locale: string) {
    return this.request('/contractors/profile', {
      method: 'PATCH',
      body: JSON.stringify({ preferred_language: locale }),
    })
  }

  async regenerateSchedulingLink(): Promise<{ calendar_link: string }> {
    return this.request<{ calendar_link: string }>('/contractors/profile/regenerate-scheduling-link', {
      method: 'POST',
    })
  }

  // --- Gmail (send on behalf) ---
  async getGmailStatus(): Promise<{ connected: boolean; email: string | null }> {
    return this.request<{ connected: boolean; email: string | null }>('/gmail/status')
  }

  /** Full URL to start Gmail OAuth; redirect the browser here (same window or tab). Pass current origin + path so callback redirects back (e.g. with locale). */
  getGmailAuthorizeUrl(redirectSuccess?: string): string {
    const url = `${this.baseURL}/gmail/authorize`
    if (redirectSuccess) {
      return `${url}?redirect_success=${encodeURIComponent(redirectSuccess)}`
    }
    return url
  }

  async disconnectGmail(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/gmail/disconnect', { method: 'DELETE' })
  }

  /** Send a generic email via contractor's Gmail. Requires Gmail connected. */
  async gmailSend(params: { to: string; subject: string; body_html: string; body_plain?: string; from_name?: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/gmail/send', {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        body_html: params.body_html,
        body_plain: params.body_plain ?? undefined,
        from_name: params.from_name ?? undefined,
      }),
    })
  }

  // --- QuickBooks Online ---
  async getQBOStatus(): Promise<{ connected: boolean; company_name: string | null; auto_invoice: boolean; realm_id: string | null }> {
    return this.request<{ connected: boolean; company_name: string | null; auto_invoice: boolean; realm_id: string | null }>('/quickbooks/status')
  }

  /** Full URL to start QBO OAuth; redirect the browser here. */
  getQBOAuthorizeUrl(redirectSuccess?: string): string {
    const url = `${this.baseURL}/quickbooks/authorize`
    if (redirectSuccess) {
      return `${url}?redirect_success=${encodeURIComponent(redirectSuccess)}`
    }
    return url
  }

  async disconnectQBO(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/quickbooks/disconnect', { method: 'DELETE' })
  }

  async updateQBOSettings(autoInvoice: boolean): Promise<{ auto_invoice: boolean }> {
    return this.request<{ auto_invoice: boolean }>(`/quickbooks/settings?auto_invoice=${autoInvoice}`, { method: 'PUT' })
  }

  async createQBOInvoice(jobId: number, sendEmail: boolean = true): Promise<{ qbo_invoice_id: string; invoice_url: string; message: string }> {
    return this.request<{ qbo_invoice_id: string; invoice_url: string; message: string }>(
      `/quickbooks/invoice/${jobId}?send_email=${sendEmail}`,
      { method: 'POST' }
    )
  }

  async sendQBOInvoiceEmail(jobId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/quickbooks/invoice/${jobId}/send`, { method: 'POST' })
  }

  async getQBOInvoiceStatus(jobId: number): Promise<{ balance: number; total: number; status: string; email_status: string }> {
    return this.request<{ balance: number; total: number; status: string; email_status: string }>(`/quickbooks/invoice/${jobId}/status`)
  }

  /** If QBO shows invoice fully paid, updates job INVOICED → PAID. Safe to call on quote load. */
  async syncQBOInvoicePaymentStatus(jobId: number): Promise<{
    updated: boolean
    job_status: string
    qbo_status: string
    balance: number
    total: number
    amount_paid: number
  }> {
    return this.request(`/quickbooks/invoice/${jobId}/sync-payment-status`, { method: 'POST' })
  }

  async getQBOInvoiceDetail(jobId: number): Promise<QBOInvoiceDetail> {
    return this.request<QBOInvoiceDetail>(`/quickbooks/invoice/${jobId}/detail`)
  }

  async getQBOProjectInvoiceDetail(projectId: number): Promise<QBOProjectInvoiceDetailResponse> {
    return this.request<QBOProjectInvoiceDetailResponse>(`/quickbooks/project/${projectId}/invoice-detail`)
  }

  // --- Native ContractorOps Invoices ---
  async createInvoiceFromJob(jobId: number): Promise<any> {
    return this.request(`/jobs/${jobId}/invoice`, { method: 'POST' })
  }

  async getInvoices(status?: string, skip = 0, limit = 50, jobId?: number): Promise<{ items: any[]; total: number }> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (jobId) params.append('job_id', jobId.toString())
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())
    return this.request<{ items: any[]; total: number }>(`/invoices?${params.toString()}`)
  }

  async getInvoiceDetail(invoiceId: number): Promise<any> {
    return this.request(`/invoices/${invoiceId}`)
  }

  async updateInvoiceStatus(invoiceId: number, status: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async recordInvoicePayment(invoiceId: number, data: {
    amount: number;
    payment_method: string;
    reference_number?: string;
    notes?: string;
  }): Promise<any> {
    return this.request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendInvoiceViaEmail(invoiceId: number): Promise<{ message: string; status: string }> {
    return this.request<{ message: string; status: string }>(`/invoices/${invoiceId}/send`, { method: 'POST' })
  }

  async uploadLogo(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/contractors/profile/logo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload logo')
    }

    return response.json()
  }

  /** Upload onboarding step 3 attachments (invoices/samples). Stored as SUPPORT_TICKET with contractor uuid. */
  async uploadOnboardingAttachments(files: File[]): Promise<{ attachments_uploaded: number }> {
    if (!files.length) return { attachments_uploaded: 0 }
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    const response = await fetch(`${this.baseURL}/contractors/profile/onboarding-attachments`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload attachments')
    }
    return response.json()
  }

  async getContractorProfile(contractorId: number) {
    return this.request(`/contractors/profile/${contractorId}`)
  }

  async getContractorProfileByUuid(contractorUuid: string) {
    return this.request(`/contractors/profile/uuid/${contractorUuid}`)
  }

  /** Resolve customer names for phone numbers from ContractorBackend leads/clients. Returns map of E.164 phone -> name. */
  async getCustomerNamesByPhones(phones: string[]): Promise<Record<string, string>> {
    if (!phones.length) return {}
    const res = await this.request<{ phone_to_name: Record<string, string> }>('/contractors/customer-names-by-phones', {
      method: 'POST',
      body: JSON.stringify({ phones }),
    })
    return res?.phone_to_name ?? {}
  }

  async getContractorOpsAiNumber(): Promise<{ twilio_number: string | null }> {
    return this.request<{ twilio_number: string | null }>('/contractors/profile/contractor-ops-ai-number')
  }

  /** Search Twilio inventory for purchasable numbers in `areaCode` (read-only). */
  async getAvailableTwilioNumbers(
    areaCode: string,
    limit = 5,
  ): Promise<TwilioAvailableNumber[]> {
    const params = new URLSearchParams({ area_code: areaCode, limit: String(limit) })
    const res = await this.request<{ numbers: TwilioAvailableNumber[] }>(
      `/contractors/profile/twilio-available?${params.toString()}`,
    )
    return res?.numbers ?? []
  }

  /** Provision the selected Twilio number for the current contractor. */
  async provisionTwilioNumber(input: {
    phoneNumber: string
    areaCode: string
    state?: string | null
  }): Promise<TwilioProvisionResult> {
    return this.request<TwilioProvisionResult>(
      '/contractors/profile/twilio-provision',
      {
        method: 'POST',
        body: JSON.stringify({
          phone_number: input.phoneNumber,
          area_code: input.areaCode,
          state: input.state ?? null,
        }),
      },
    )
  }

  /** Read the contractor's SMS auto-reply template (or the platform default). */
  async getAutoReply(): Promise<AutoReplySettings> {
    return this.request<AutoReplySettings>('/contractors/profile/auto-reply')
  }

  /** Update the auto-reply template. Pass null to reset to the platform default. */
  async updateAutoReply(message: string | null): Promise<AutoReplySettings> {
    return this.request<AutoReplySettings>('/contractors/profile/auto-reply', {
      method: 'PUT',
      body: JSON.stringify({ message }),
    })
  }

  // ─── Your Frontline ───────────────────────────────────────────────────────

  async getFrontlineSettings(): Promise<FrontlineSettings> {
    return this.request('/contractors/profile/frontline/settings')
  }

  async getFrontlineSetupContext(): Promise<FrontlineSetupContextResponse> {
    return this.request('/contractors/profile/frontline/setup/context')
  }

  async generateFrontlineSetup(operator?: {
    operator_display_name?: string
    operator_voice_id?: string
  }): Promise<FrontlineSetupGenerateResponse> {
    const frontend_origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_FRONTEND_URL || undefined
    return this.request('/contractors/profile/frontline/setup/generate', {
      method: 'POST',
      body: JSON.stringify({ frontend_origin, ...operator }),
    })
  }

  async confirmFrontlineSetup(
    preview: FrontlineSetupPreview,
  ): Promise<FrontlineSettings> {
    return this.request('/contractors/profile/frontline/setup/confirm', {
      method: 'POST',
      body: JSON.stringify({ preview }),
    })
  }

  async updateFrontlineSettings(
    payload: Partial<FrontlineSettings>,
  ): Promise<FrontlineSettings> {
    return this.request('/contractors/profile/frontline/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async getFrontlineKnowledge(): Promise<FrontlineKnowledgeDoc> {
    return this.request('/contractors/profile/frontline/knowledge')
  }

  async updateFrontlineKnowledge(
    markdown_text: string,
    reindex = true,
  ): Promise<FrontlineKnowledgeDoc> {
    return this.request('/contractors/profile/frontline/knowledge', {
      method: 'PUT',
      body: JSON.stringify({ markdown_text, reindex }),
    })
  }

  async submitFrontlineKnowledgeIntake(
    intake_text: string,
    source = 'text_intake',
  ): Promise<FrontlineKnowledgeIntakeResponse> {
    const frontend_origin =
      typeof window !== 'undefined' ? window.location.origin : undefined
    return this.request('/contractors/profile/frontline/knowledge/intake', {
      method: 'POST',
      body: JSON.stringify({ intake_text, source, frontend_origin }),
    })
  }

  async reindexFrontlineKnowledge(): Promise<{ profile_uuid: string; chunks_indexed: number }> {
    return this.request('/contractors/profile/frontline/knowledge/reindex', {
      method: 'POST',
    })
  }

  async frontlineSandboxAsk(
    question: string,
    contractor_name?: string,
  ): Promise<FrontlineSandboxAnswer> {
    const frontend_origin =
      typeof window !== 'undefined' ? window.location.origin : undefined
    return this.request('/contractors/profile/frontline/sandbox/ask', {
      method: 'POST',
      body: JSON.stringify({ question, contractor_name, frontend_origin }),
    })
  }

  async frontlineTeach(payload: {
    corrected_answer: string
    question?: string
    bad_answer?: string
    source?: string
  }): Promise<FrontlineTeachNote> {
    return this.request('/contractors/profile/frontline/teach', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getFrontlineActivity(limit = 50): Promise<{ events: FrontlineActivityEvent[] }> {
    return this.request(`/contractors/profile/frontline/activity?limit=${limit}`)
  }

  async getFrontlineApprovals(status = 'pending'): Promise<{
    approvals: FrontlineReplyApproval[]
  }> {
    return this.request(
      `/contractors/profile/frontline/approvals?status=${encodeURIComponent(status)}`,
    )
  }

  async getFrontlineVoiceDevStatus(): Promise<FrontlineVoiceDevStatus> {
    return this.request('/contractors/profile/frontline/voice/dev/status')
  }

  async getFrontlineVoiceTrainingEligibility(): Promise<FrontlineVoiceTrainingEligibility> {
    return this.request('/contractors/profile/frontline/voice/training/eligibility')
  }

  async startFrontlineVoiceTrainingSession(): Promise<FrontlineVoiceTrainingSessionStart> {
    return this.request('/contractors/profile/frontline/voice/training/session', {
      method: 'POST',
    })
  }

  async getFrontlineVoiceTrainingSession(
    sessionUuid: string,
  ): Promise<FrontlineVoiceTrainingSession> {
    return this.request(`/contractors/profile/frontline/voice/training/session/${sessionUuid}`)
  }

  async startFrontlineVoiceDemoSession(): Promise<FrontlineVoiceDemoSessionStart> {
    return this.request('/contractors/frontline/voice/demo/session', {
      method: 'POST',
      timeoutMs: 30_000,
    })
  }

  private resolveWebSocketOrigin(): string {
    const configured = BACKEND_WS_ORIGIN
    if (configured) {
      try {
        const origin = new URL(configured).origin
        console.log(`🔌 Voice WS origin (NEXT_PUBLIC_BACKEND_WS_ORIGIN): ${origin}`)
        return origin
      } catch {
        console.warn(`Invalid NEXT_PUBLIC_BACKEND_WS_ORIGIN: ${configured}`)
      }
    }

    // Same-origin /api (Vercel rewrites) — only use frontend origin when
    // NEXT_PUBLIC_BACKEND_WS_ORIGIN is unset. Prefer setting that env to the
    // deployed ContractorBackend host (e.g. https://contractorbackend-h0ax.onrender.com).
    if (typeof window !== 'undefined' && this.getBaseURL().startsWith('/')) {
      console.warn(
        'NEXT_PUBLIC_BACKEND_WS_ORIGIN is not set; voice WebSocket will use the frontend origin. ' +
          'Set it to your ContractorBackend URL for reliable Nova Sonic on staging/prod.',
      )
      console.log(`🔌 Voice WS origin (frontend fallback): ${window.location.origin}`)
      return window.location.origin
    }

    const apiBase = this.baseURL
    try {
      const origin = new URL(apiBase).origin
      console.log(`🔌 Voice WS origin (derived from API URL): ${origin}`)
      return origin
    } catch {
      if (typeof window !== 'undefined') {
        console.log(`🔌 Voice WS origin (browser fallback): ${window.location.origin}`)
        return window.location.origin
      }
      console.log('🔌 Voice WS origin (default): http://localhost:4000')
      return 'http://localhost:4000'
    }
  }

  frontlineVoiceTrainingWebSocketUrl(path: string, token?: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const wsUrl = new URL(normalizedPath, `${this.resolveWebSocketOrigin()}/`)
    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    if (token) {
      wsUrl.searchParams.set('token', token)
    }
    const redacted = wsUrl.toString().replace(/([?&]token=)[^&]+/, '$1[redacted]')
    console.log(`🔌 Voice WebSocket URL: ${redacted}`)
    return wsUrl.toString()
  }

  frontlineVoiceDemoWebSocketUrl(path: string, token?: string): string {
    return this.frontlineVoiceTrainingWebSocketUrl(path, token)
  }

  async submitQuoteRequest(contractorUuid: string, data: any, files?: File[], measurements?: { items: any[] }) {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    if (data.address) formData.append('address', data.address)

    // Add structured address data from Mapbox if available
    if (data.address_data) {
      formData.append('address_data', JSON.stringify(data.address_data))
    }

    if (data.project_type) formData.append('project_type', data.project_type)
    if (data.description) formData.append('description', data.description)

    // Add measurements as JSON string if provided and has items with data
    // Only send if user has added at least one measurement entry (has type or other data)
    if (measurements && measurements.items && measurements.items.length > 0) {
      // Filter out completely empty entries (no type, no values, no name)
      const validItems = measurements.items.filter(item =>
        item.type || item.length || item.width || item.value || item.name
      )
      if (validItems.length > 0) {
        formData.append('measurements', JSON.stringify({ items: validItems }))
      }
    }

    if (files) {
      files.forEach((file) => {
        formData.append('files', file)
      })
    }

    return fetch(`${this.baseURL}/contractors/${contractorUuid}/quote-request`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then((res) => res.json())
  }

  async getMyLeads(status?: string, skip = 0, limit = 20) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    return this.request(`/leads?${params.toString()}`)
  }

  async getUnifiedLeads(filter = 'all', status?: string, limit = 50) {
    const params = new URLSearchParams()
    params.append('filter', filter)
    if (status) params.append('status', status)
    params.append('limit', limit.toString())

    return this.request<{ leads: any[]; total: number }>(`/leads/unified?${params.toString()}`)
  }

  async getLead(leadId: number) {
    return this.request(`/leads/${leadId}`)
  }

  async updateLead(leadId: number, data: any) {
    return this.request(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async markLeadContacted(leadId: number) {
    return this.request(`/leads/${leadId}/contact`, {
      method: 'POST',
    })
  }

  async getMyJobs(
    status?: string | string[],
    skip = 0,
    limit = 20,
    clientId?: number,
    search?: string,
    projectId?: number
  ) {
    const params = new URLSearchParams()
    if (Array.isArray(status)) {
      status.forEach((s) => {
        if (s) params.append('status', s)
      })
    } else if (status) {
      params.append('status', status)
    }
    if (clientId != null) params.append('client_id', String(clientId))
    if (projectId != null) params.append('project_id', String(projectId))
    const q = search?.trim()
    if (q) params.append('search', q)
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    return this.request(`/jobs?${params.toString()}`)
  }

  async getJobStats(): Promise<{
    active_jobs: number
    total_revenue: number
    total_jobs: number
    draft_count: number
    sent_count: number
    accepted_count: number
    in_progress_count: number
    completed_count: number
    paid_count: number
  }> {
    return this.request('/jobs/stats')
  }

  async getJob(jobId: number) {
    return this.request(`/jobs/${jobId}`)
  }

  async createChangeOrder(jobId: number, data: { change_order_reason?: string; job_description?: string; items?: any[] }) {
    return this.request(`/jobs/${jobId}/change-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getChangeOrders(jobId: number) {
    return this.request(`/jobs/${jobId}/change-orders`)
  }

  async getRevisedContractAmount(jobId: number) {
    return this.request(`/jobs/${jobId}/revised-contract-amount`)
  }

  async getProposalOverview(jobId: number) {
    return this.request(`/jobs/${jobId}/proposal-overview`)
  }

  async generateAIProposal(jobId: number, description?: string, selectedItemIds?: number[]): Promise<{
    scope_summary_html: string
    project_overview_title: string
    project_overview_html: string
    suggested_theme?: string | null
    before_after_pairs: Array<{ index: number; before_url: string; after_url: string }>
    pages: Array<{
      title: string
      blocks: Array<{ type: string; content_html?: string }>
    }>
  }> {
    return this.request(`/jobs/${jobId}/generate-ai-proposal`, {
      method: 'POST',
      body: JSON.stringify({
        description: description ?? null,
        selected_item_ids: selectedItemIds ?? null,
      }),
    })
  }

  async getJobByPublicLink(publicLink: string) {
    return this.fetchPublic(`/jobs/public/${publicLink}`)
  }

  async getProposalByPublicLink(publicLink: string) {
    return this.fetchPublic(`/proposals/public/${publicLink}`)
  }

  // ── Proposal CRUD (project-centric) ──────────────────────────────────────

  async getProjectProposals(projectId: number) {
    return this.request(`/projects/${projectId}/proposals`)
  }

  async createStandaloneProposal(data: { title?: string; client_id?: number }) {
    return this.request(`/proposals`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getStandaloneProposal(proposalId: number) {
    return this.request(`/proposals/${proposalId}`)
  }

  async updateStandaloneProposal(proposalId: number, data: {
    title?: string
    status?: string
    proposal_document?: any
  }) {
    return this.request(`/proposals/${proposalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async listStandaloneProposals() {
    return this.request(`/proposals/standalone`)
  }

  async createProposal(projectId: number, data: { title?: string; quote_references?: Array<{ job_id: number }> }) {
    return this.request(`/projects/${projectId}/proposals`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, ...data }),
    })
  }

  async getProposal(projectId: number, proposalId: number) {
    return this.request(`/projects/${projectId}/proposals/${proposalId}`)
  }

  async updateProposal(projectId: number, proposalId: number, data: {
    title?: string
    status?: string
    proposal_document?: any
    quote_references?: Array<{ job_id: number; selected_tier?: string; snapshot_total?: number }>
  }) {
    return this.request(`/projects/${projectId}/proposals/${proposalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProposal(projectId: number, proposalId: number) {
    return this.request(`/projects/${projectId}/proposals/${proposalId}`, {
      method: 'DELETE',
    })
  }

  async getProposalOverviewForProject(projectId: number, proposalId: number) {
    return this.request(`/projects/${projectId}/proposals/${proposalId}/proposal-overview`)
  }

  async generateAIProposalForProject(
    projectId: number,
    proposalId: number,
    opts?: { description?: string; job_id?: number; selected_item_ids?: number[]; clarified_scope?: ScopeClarifiedScope | null }
  ): Promise<{
    scope_summary_html: string
    project_overview_title: string
    project_overview_html: string
    suggested_theme?: string | null
    before_after_pairs: Array<{ index: number; before_url: string; after_url: string }>
    pages: Array<{ title: string; blocks: Array<{ type: string; content_html?: string }> }>
  }> {
    return this.request(`/projects/${projectId}/proposals/${proposalId}/generate-ai-proposal`, {
      method: 'POST',
      body: JSON.stringify({
        description: opts?.description ?? null,
        job_id: opts?.job_id ?? null,
        selected_item_ids: opts?.selected_item_ids ?? null,
        clarified_scope: opts?.clarified_scope ?? null,
      }),
    })
  }

  async createJob(data: any) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateJob(jobId: number, data: any) {
    return this.request(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async uploadQuoteMedia(jobId: number, files: File[]) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const response = await fetch(`${this.baseURL}/jobs/${jobId}/upload-media`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload quote media')
    }

    return response.json()
  }

  async deleteJob(jobId: number) {
    const url = `${this.baseURL}/jobs/${jobId}`

    const config: RequestInit = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
        throw new Error(this.formatApiErrorDetail(error?.detail))
      }

      // 204 No Content responses don't have a body
      if (response.status === 204) {
        return null
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getClients(skip = 0, limit = 20, status?: string) {
    const params = new URLSearchParams()
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())
    if (status) params.append('status', status)

    const res = await this.request<any>(`/clients?${params.toString()}`)

    // Safety filter: never show archived clients in normal UI pickers/lists unless explicitly requested.
    const isArchivedFilter = String(status ?? '').toUpperCase() === 'ARCHIVED'
    const isNotArchived = (c: any) => String(c?.status ?? '').toUpperCase() !== 'ARCHIVED'

    if (!isArchivedFilter) {
      if (Array.isArray(res)) return res.filter(isNotArchived)
      if (res && Array.isArray(res.items)) return { ...res, items: res.items.filter(isNotArchived) }
    }
    return res
  }

  async getClient(clientId: number) {
    return this.request(`/clients/${clientId}`)
  }

  async getClientDetails(clientId: number) {
    return this.request(`/clients/${clientId}/details`)
  }

  async updateClient(clientId: number, data: any) {
    return this.request(`/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteClient(clientId: number): Promise<void> {
    await this.request<void>(`/clients/${clientId}`, {
      method: 'DELETE',
    })
  }

  async searchMaterials(query: string, zipCode?: string, maxResults = 10) {
    console.log(`🌐 API Client: Searching materials for "${query}"`)
    const startTime = Date.now()

    const params = new URLSearchParams()
    params.append('query', query)
    if (zipCode) params.append('location_zip_code', zipCode)
    params.append('max_results', maxResults.toString())

    const url = `/intelligent/materials/search?${params.toString()}`
    console.log(`🌐 API Client: Making request to ${url}`)

    try {
      const result = await this.request(url, {
        method: 'POST',
      })
      const duration = Date.now() - startTime
      console.log(`🌐 API Client: Request completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`🌐 API Client: Request failed after ${duration}ms:`, error)
      throw error
    }
  }

  async generateEstimate(data: {
    description: string
    project_type?: string
    measurements?: any
    lead_id?: number
    project_id?: number | null
    location_zip_code?: string
    labor_charge_type?: string
    labor_rate_value?: number
    labor_unit_type?: string
    project_brief?: any
    clarified_scope?: ScopeClarifiedScope | null
  }) {
    console.log(`🤖 API Client: Generating AI estimate`)
    const startTime = Date.now()

    try {
      const result = await this.request('/generate-estimate', {
        method: 'POST',
        body: JSON.stringify(data),
        timeoutMs: AI_ESTIMATE_REQUEST_TIMEOUT_MS,
      })
      const duration = Date.now() - startTime
      console.log(`🤖 API Client: Estimate generated in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`🤖 API Client: Estimate generation failed after ${duration}ms:`, error)
      throw error
    }
  }

  async signQuoteAsContractor(jobId: number, signatureData: {
    signature_data: string
    signer_name: string
    signer_email?: string
    accepted_terms: boolean
    accepted_total_amount?: string
    additional_notes?: string
  }) {
    return this.request(`/jobs/${jobId}/sign/contractor`, {
      method: 'POST',
      body: JSON.stringify(signatureData),
    })
  }

  async signQuoteAsCustomer(jobId: number, signatureData: {
    signature_data: string
    signer_name: string
    signer_email?: string
    accepted_terms: boolean
    accepted_total_amount?: string
    additional_notes?: string
  }) {
    return this.fetchPublic(`/jobs/${jobId}/sign/customer`, {
      method: 'POST',
      body: JSON.stringify(signatureData),
    })
  }

  async getQuoteSignature(jobId: number) {
    return this.request(`/jobs/${jobId}/signature`)
  }

  async generateQuotePublicLink(jobId: number) {
    const response = await this.request<{ public_link: string; public_url: string }>(`/jobs/${jobId}/generate-public-link`, {
      method: 'POST',
    })
    return response.public_link
  }

  /** Send formatted proposal email to client via contractor's Gmail. Requires Gmail connected. */
  async sendProposalEmail(projectId: number, proposalId: number, to: string, proposalUrl: string): Promise<{ message: string }> {
    return this.request(`/projects/${projectId}/proposals/${proposalId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ to, proposal_url: proposalUrl }),
    })
  }

  /** Send formatted quote email to client via contractor's Gmail. Requires Gmail connected. */
  async sendQuoteEmail(jobId: number, to: string, quoteUrl: string): Promise<{ message: string }> {
    return this.request(`/jobs/${jobId}/send-quote-email`, {
      method: 'POST',
      body: JSON.stringify({ to, quote_url: quoteUrl }),
    })
  }

  /** Send formatted follow-up email to client via contractor's Gmail. Requires Gmail connected. */
  async sendFollowupEmail(jobId: number, to: string, message?: string): Promise<{ message: string }> {
    return this.request(`/jobs/${jobId}/send-followup-email`, {
      method: 'POST',
      body: JSON.stringify({ to, message: message ?? undefined }),
    })
  }

  // =========================
  // Calendar (Native Google Integration)
  // =========================
  async getCalendarBookings(month: string) {
    const searchParams = new URLSearchParams()
    searchParams.append('month', month)
    return this.request<{
      events: Array<{
        source: 'native' | 'google'
        id: string | number
        title: string
        start: string
        end: string
        status?: string
        type?: 'virtual' | 'physical'
        location?: string | null
        meet_link?: string | null
        client_name?: string | null
        client_email?: string | null
        client_phone?: string | null
      }>
    }>(`/calendar/events?${searchParams.toString()}`)
  }

  async getBookings(params?: {
    limit?: number
    client_email?: string
    type?: string
    sorting_order?: 'asc' | 'desc'
    month?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.client_email) searchParams.append('client_email', params.client_email)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.sorting_order) searchParams.append('sorting_order', params.sorting_order)
    if (params?.month) searchParams.append('month', params.month)
    const suffix = searchParams.toString()
    return this.request<{
      bookings: Array<{
        id: number | string
        client_id?: number | null
        client_name?: string | null
        client_email?: string | null
        client_phone?: string | null
        title?: string
        status?: string
        type?: 'virtual' | 'physical'
        start?: string
        end?: string
        start_time?: string
        end_time?: string
        location?: string | null
        notes?: string | null
        google_event_id?: string | null
        google_meet_link?: string | null
        time_zone?: string | null
      }>
    }>(`/calendar/bookings${suffix ? `?${suffix}` : ''}`)
  }

  async getAvailabilities() {
    return this.request<{
      availabilities: Array<{
        day_of_week: number
        start_time: string
        end_time: string
        timezone: string
      }>
    }>(`/calendar/availabilities`)
  }

  /**
   * Fetch available slots (Combining DB and Google Calendar freebusy).
   */
  async getAvailableSlots(params: { date: string; timezone: string; duration_minutes?: number }) {
    const searchParams = new URLSearchParams()
    searchParams.append('date', params.date)
    searchParams.append('timezone', params.timezone)
    if (params.duration_minutes) searchParams.append('duration_minutes', params.duration_minutes.toString())
    return this.request<{ slots: string[] }>(
      `/calendar/slots?${searchParams.toString()}`
    )
  }

  async saveAvailabilities(payload: {
    availabilities: Array<{
      day_of_week: number
      start_time: string
      end_time: string
      timezone: string
    }>
  }) {
    return this.request(`/calendar/availabilities`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  /**
   * Create a native booking and sync to Google Calendar
   */
  async createBooking(payload: {
    client_name: string
    client_email?: string
    client_phone?: string
    time_zone: string
    slot_date: string
    slot_start_time: string
    duration_minutes?: number
    preferred_meeting_spot?: string
    location?: string
    description?: string
    form_responses?: Record<string, unknown>
  }) {
    return this.request(`/calendar/bookings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  // Legacy compatibility wrappers while NeetoCal references are being removed.
  async getNeetoBookings(params?: {
    limit?: number
    page_size?: number
    client_email?: string
    type?: string
    sorting_order?: 'asc' | 'desc'
    month?: string
  }) {
    return this.getBookings({
      limit: params?.limit ?? params?.page_size,
      client_email: params?.client_email,
      type: params?.type,
      sorting_order: params?.sorting_order,
      month: params?.month,
    })
  }

  async getNeetoSlots(params: {
    time_zone: string
    year: string
    month: string
    day?: string
    duration_minutes?: number
  }) {
    const date = `${params.year}-${String(params.month).padStart(2, '0')}-${String(params.day ?? '1').padStart(2, '0')}`
    const res = await this.getAvailableSlots({
      date,
      timezone: params.time_zone,
      duration_minutes: params.duration_minutes,
    })
    return {
      slots: [
        {
          date,
          slots: Object.fromEntries(
            (res.slots ?? []).map((iso, idx) => [`slot_${idx}`, { start_time: iso }])
          ),
        },
      ],
    }
  }

  async createNeetoBooking(payload: {
    name: string
    email?: string
    phone?: string
    time_zone: string
    slot_date: string
    slot_start_time: string
    duration_minutes?: number
    preferred_meeting_spot?: string
    location?: string
    description?: string
  }) {
    return this.createBooking({
      client_name: payload.name,
      client_email: payload.email,
      client_phone: payload.phone,
      time_zone: payload.time_zone,
      slot_date: payload.slot_date,
      slot_start_time: payload.slot_start_time,
      duration_minutes: payload.duration_minutes,
      preferred_meeting_spot: payload.preferred_meeting_spot,
      location: payload.location,
      description: payload.description,
    })
  }

  /** Cancel a booking. DELETE /calendar/bookings/{booking_id} */
  async cancelBooking(bookingId: string | number) {
    return this.request(`/calendar/bookings/${encodeURIComponent(String(bookingId))}`, {
      method: 'DELETE',
    })
  }

  /** Reschedule a booking. PATCH /calendar/bookings/{booking_id}/reschedule */
  async rescheduleBooking(bookingId: string | number, payload: {
    slot_date: string
    slot_start_time: string
    time_zone: string
    duration_minutes?: number
  }) {
    return this.request(`/calendar/bookings/${encodeURIComponent(String(bookingId))}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  // =========================
  // Billing / Stripe
  // =========================

  async createCheckoutSession(data: {
    plan: 'monthly' | 'yearly'
    success_url: string
    cancel_url: string
  }): Promise<{ url: string }> {
    return this.request('/billing/checkout-session', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createPortalSession(data: {
    return_url: string
  }): Promise<{ url: string }> {
    return this.request('/billing/portal-session', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // =========================
  // Translation Service
  // =========================
  async translateText(text: string, targetLanguage: string, sourceLanguage?: string): Promise<{
    translated_text: string
    source_language: string | null
    target_language: string
    original_text: string
  }> {
    return this.request('/translate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        target_language: targetLanguage,
        source_language: sourceLanguage
      }),
    })
  }

  async translateBatch(texts: string[], targetLanguage: string, sourceLanguage?: string): Promise<{
    translated_texts: string[]
    target_language: string
    source_language: string | null
    count: number
  }> {
    return this.request('/translate/batch', {
      method: 'POST',
      body: JSON.stringify({
        texts,
        target_language: targetLanguage,
        source_language: sourceLanguage
      }),
    })
  }

  async getSupportedLanguages(): Promise<{
    languages: Record<string, string>
    default_target: string
    default_source: string
  }> {
    return this.request('/translate/languages')
  }

  // =========================
  // Property Insights (RentCast)
  // =========================
  async fetchPropertyInsights(addressId: number): Promise<{
    address_id: number
    property_metadata: Record<string, unknown> | null
    from_cache: boolean
  }> {
    return this.request('/property-info/fetch', {
      method: 'POST',
      body: JSON.stringify({ address_id: addressId }),
    })
  }

  async fetchPropertyInsightsDetails(addressId: number): Promise<{
    address_id: number
    property_metadata: Record<string, unknown> | null
  }> {
    return this.request(`/property-info/details?address_id=${encodeURIComponent(addressId)}`)
  }

  // =========================
  // Project Templates for AI Estimator
  // =========================

  /**
   * Get project templates for the current contractor (filtered by their trade/contractor_type)
   */
  async getTemplates(): Promise<Array<{
    id: number
    trade: string
    project_type: string
  }>> {
    return this.request('/templates')
  }

  /**
   * Get all available templates (for admin or testing)
   */
  async getAllTemplates(): Promise<Array<{
    id: number
    trade: string
    project_type: string
  }>> {
    return this.request('/templates/all')
  }

  /**
   * Get a single template with its variables
   */
  async getTemplate(templateId: number): Promise<{
    id: number
    trade: string
    project_type: string
    prompt_template: string
    variables: Array<{
      id: number
      variable_name: string
      display_label: string
      input_type: string
      options?: string[]
      unit?: string
      is_required: boolean
      display_order: number
      placeholder?: string
      help_text?: string
    }>
  }> {
    return this.request(`/templates/${templateId}`)
  }

  // =========================
  // Projects / Project Management
  // =========================

  async getProjects(params?: { status?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status_filter', params.status)
    if (typeof params?.skip === 'number') searchParams.append('skip', params.skip.toString())
    if (typeof params?.limit === 'number') searchParams.append('limit', params.limit.toString())
    const qs = searchParams.toString()
    return this.request(`/projects${qs ? `?${qs}` : ''}`)
  }

  async getProject(projectId: number) {
    return this.request(`/projects/${projectId}`)
  }

  async getProjectQuotes(projectId: number) {
    return this.request(`/projects/${projectId}/quotes`)
  }

  async createProject(data: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProject(projectId: number, data: any) {
    return this.request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProject(projectId: number) {
    return this.request(`/projects/${projectId}`, {
      method: 'DELETE',
    })
  }

  async unlinkProjectQuote(projectId: number, quoteId: number) {
    return this.request(`/projects/${projectId}/unlink-quote/${quoteId}`, {
      method: 'POST',
    })
  }

  async getProjectTasks(projectId: number) {
    return this.request(`/projects/${projectId}/tasks`)
  }

  async getAllProjectTasks() {
    return this.request('/project-tasks')
  }

  async createProjectTask(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProjectTask(projectId: number, taskId: number, data: any) {
    return this.request(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProjectTask(projectId: number, taskId: number) {
    return this.request(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    })
  }

  async getProjectTrades(projectId: number) {
    return this.request(`/projects/${projectId}/trades`)
  }

  async getAllSubcontractors(): Promise<Array<{
    subcontractor_name: string
    subcontractor_email: string | null
    phone_number: string | null
    specialty?: string | null
  }>> {
    return this.request('/projects/subcontractors/all')
  }

  // =========================
  // Subcontractors CRM
  // =========================

  async getSubcontractors(skip = 0, limit = 100): Promise<any[]> {
    return this.request(`/subcontractors?skip=${skip}&limit=${limit}`)
  }

  async getSubcontractor(id: number): Promise<any> {
    return this.request(`/subcontractors/${id}`)
  }

  async createSubcontractor(data: {
    name: string
    email?: string
    phone_number?: string
    company_name?: string
    specialty?: string
    address?: string
    notes?: string
    status?: string
    daily_availability_status?: 'AVAILABLE' | 'UNAVAILABLE' | 'PENDING'
  }): Promise<any> {
    return this.request('/subcontractors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSubcontractor(id: number, data: {
    name?: string
    email?: string
    phone_number?: string
    company_name?: string
    specialty?: string
    address?: string
    notes?: string
    status?: string
    dispatch_priority?: number
    daily_availability_status?: 'AVAILABLE' | 'UNAVAILABLE' | 'PENDING'
  }): Promise<any> {
    return this.request(`/subcontractors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteSubcontractor(id: number): Promise<void> {
    return this.request(`/subcontractors/${id}`, {
      method: 'DELETE',
    })
  }

  async uploadJobMedia(jobId: number, files: File[]) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await fetch(`${this.baseURL}/jobs/${jobId}/upload-media`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload job media')
    }

    return response.json()
  }

  async generateAfterImage(jobId: number, beforeImageUrl: string, options?: {
    afterImageDescription: string
    userPrompt?: string
    lineItems?: Array<{
      title?: string
      description?: string
      custom_description?: string
      quantity?: number
      unit_of_measure?: string
    }>
  }): Promise<{ after_image_url: string }> {
    return this.request<{ after_image_url: string }>(`/jobs/${jobId}/generate-after-image`, {
      method: 'POST',
      body: JSON.stringify({
        before_image_url: beforeImageUrl,
        after_image_description: options?.afterImageDescription,
        user_prompt: options?.userPrompt,
        line_items: options?.lineItems,
      }),
    })
  }

  async generateAfterImagePreview(params: {
    beforeImage: File
    jobTitle: string
    jobDescription: string
    afterImageDescription: string
    userPrompt?: string
    lineItems: Array<{
      title?: string
      description?: string
      custom_description?: string
      quantity?: number
      unit_of_measure?: string
    }>
  }): Promise<{ after_image_url: string }> {
    const formData = new FormData()
    formData.append('before_image', params.beforeImage)
    formData.append('job_title', params.jobTitle)
    formData.append('job_description', params.jobDescription)
    formData.append('after_image_description', params.afterImageDescription)
    formData.append('user_prompt', params.userPrompt || '')
    formData.append('line_items_json', JSON.stringify(params.lineItems))

    const response = await fetch(`${this.baseURL}/jobs/generate-after-image-preview`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to generate after image')
    }

    return response.json()
  }

  async generateAfterImagesBatch(jobId: number, params: {
    beforeImages: File[]
    afterImageDescription: string
    userPrompt?: string
    lineItems?: Array<{
      title?: string
      description?: string
      custom_description?: string
      quantity?: number
      unit_of_measure?: string
    }>
  }): Promise<{
    items: Array<{
      image_index: number
      success: boolean
      before_file_name?: string | null
      after_file_name?: string | null
      before_image_url?: string | null
      after_image_url?: string | null
      before_media_id?: number | null
      after_media_id?: number | null
      error?: string | null
    }>
  }> {
    const formData = new FormData()
    params.beforeImages.forEach((file) => {
      formData.append('before_images', file)
    })
    formData.append('after_image_description', params.afterImageDescription)
    formData.append('user_prompt', params.userPrompt || '')
    formData.append('line_items_json', JSON.stringify(params.lineItems || []))

    const response = await fetch(`${this.baseURL}/jobs/${jobId}/generate-after-images`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to generate before and after images')
    }

    return response.json()
  }

  async createProjectTrade(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/trades`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProjectTrade(projectId: number, tradeId: number, data: any) {
    return this.request(`/projects/${projectId}/trades/${tradeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProjectTrade(projectId: number, tradeId: number) {
    return this.request(`/projects/${projectId}/trades/${tradeId}`, {
      method: 'DELETE',
    })
  }

  async getTradeScopePublic(tradeUuid: string) {
    return this.request(`/projects/trade/${tradeUuid}`)
  }

  async acceptTradeScopePublic(tradeUuid: string) {
    return this.request(`/projects/trade/${tradeUuid}/accept`, {
      method: 'POST',
    })
  }

  async updateTradeTaskStatusPublic(tradeUuid: string, taskId: number, status: string) {
    const response = await fetch(`${this.baseURL}/projects/trade/${tradeUuid}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to update task status')
    }
    return response.json()
  }

  async uploadProjectMedia(projectId: number, files: File[], context: string, tradeId?: number, taskId?: number) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('context', context)
    if (tradeId) formData.append('trade_id', tradeId.toString())
    if (taskId) formData.append('task_id', taskId.toString())

    const response = await fetch(`${this.baseURL}/projects/${projectId}/upload-media`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload project media')
    }

    return response.json()
  }

  async deleteProjectMedia(projectId: number, mediaId: number) {
    await this.request(`/projects/${projectId}/media/${mediaId}`, {
      method: 'DELETE',
    })
  }

  async uploadProjectAttachment(projectId: number, files: File[], description?: string) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (description) formData.append('description', description)

    const response = await fetch(`${this.baseURL}/projects/${projectId}/attachments`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload project attachment')
    }

    return response.json()
  }

  async deleteProjectAttachment(projectId: number, attachmentId: number) {
    await this.request(`/projects/${projectId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
  }

  async uploadTradeMediaPublic(tradeUuid: string, files: File[], context: string) {
    if (!files || files.length === 0) return []

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('context', context)

    const response = await fetch(`${this.baseURL}/projects/trade/${tradeUuid}/upload-media`, {
      method: 'POST',
      body: formData,
      // No credentials since it's a public endpoint
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload trade media')
    }

    return response.json()
  }

  async attachProjectMedia(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/media`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async attachQuoteMedia(jobId: number, data: any) {
    return this.request(`/jobs/${jobId}/media`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async uploadCostBook(file: File): Promise<any[]> {
    const formData = new FormData()
    formData.append('file', file)
    
    // Custom fetch because of FormData and missing content-type
    const response = await fetch(`${this.baseURL}/cost-book/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(this.formatApiErrorDetail(error?.detail) || 'Failed to upload cost book')
    }

    return response.json()
  }

  async confirmCostBook(items: any[]): Promise<{ message: string }> {
    return this.request('/cost-book/confirm', {
      method: 'POST',
      body: JSON.stringify({ items }),
    })
  }

  async getQuoteItemsAutocomplete(query: string, source: 'all' | 'master' | 'historical' = 'all') {
    const params = new URLSearchParams({ q: query, source })
    return this.request<any[]>(`/quote-items/autocomplete?${params.toString()}`)
  }

  async getCostBook(): Promise<any[]> {
    return this.request('/cost-book')
  }

  async deleteCostBookItem(itemId: number): Promise<{ success: boolean }> {
    return this.request(`/cost-book/${itemId}`, {
      method: 'DELETE',
    })
  }

  async getPublicSubcontractor(uuid: string) {
    const url = `${this.baseURL}/subcontractors/public/${uuid}`
    const config: RequestInit = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
        throw new Error(this.formatApiErrorDetail(error?.detail))
      }
      return response.json()
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('Network error')
    }
  }

  async updatePublicSubcontractorAvailability(uuid: string, data: any) {
    const url = `${this.baseURL}/subcontractors/public/${uuid}`
    const config: RequestInit = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
        throw new Error(this.formatApiErrorDetail(error?.detail))
      }
      return response.json()
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('Network error')
    }
  }

  // =========================
  // Project Financials 
  // =========================

  async getProjectCostItems(projectId: number) {
    return this.request<any[]>(`/projects/${projectId}/financials/cost-items`)
  }

  async createProjectCostItem(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/financials/cost-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProjectCostItem(projectId: number, itemId: number, data: any) {
    return this.request(`/projects/${projectId}/financials/cost-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProjectCostItem(projectId: number, itemId: number) {
    return this.request(`/projects/${projectId}/financials/cost-items/${itemId}`, {
      method: 'DELETE',
    })
  }

  async getProjectMaterials(projectId: number, category?: string) {
    const query = category ? `?category=${category}` : ''
    return this.request<any[]>(`/projects/${projectId}/financials/materials${query}`)
  }

  async createProjectMaterial(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/financials/materials`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProjectMaterial(projectId: number, itemId: number, data: any) {
    return this.request(`/projects/${projectId}/financials/materials/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteProjectMaterial(projectId: number, itemId: number) {
    return this.request(`/projects/${projectId}/financials/materials/${itemId}`, {
      method: 'DELETE',
    })
  }

  async getProjectPayments(projectId: number) {
    return this.request<any[]>(`/projects/${projectId}/financials/payments`)
  }

  async createProjectPayment(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/financials/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteProjectPayment(projectId: number, paymentId: number) {
    return this.request(`/projects/${projectId}/financials/payments/${paymentId}`, {
      method: 'DELETE',
    })
  }

  async getProjectFinancialSummary(projectId: number) {
    return this.request<any>(`/projects/${projectId}/financials/summary`)
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.request<Campaign[]>('/campaigns')
  }

  async getCampaign(campaignUuid: string): Promise<CampaignDetail> {
    return this.request<CampaignDetail>(`/campaigns/${campaignUuid}`)
  }

  async createCampaign(data: CampaignPayload): Promise<Campaign> {
    return this.request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(campaignUuid: string, data: Partial<CampaignPayload>): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getCampaignForecast(data: DiscoveryForecastRequest): Promise<DiscoveryForecast> {
    return this.request<DiscoveryForecast>('/campaigns/discovery-forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateCampaignStrategies(data: GenerateCampaignStrategiesRequest): Promise<GenerateCampaignStrategiesResponse> {
    return this.request<GenerateCampaignStrategiesResponse>('/campaigns/generate-strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateCampaignBrief(campaignUuid: string): Promise<CampaignGenerateBriefResponse> {
    return this.request<CampaignGenerateBriefResponse>(`/campaigns/${campaignUuid}/generate-brief`, {
      method: 'POST',
    })
  }

  async approveCampaignBrief(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/approve-brief`, {
      method: 'POST',
    })
  }

  async launchCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/launch`, {
      method: 'POST',
    })
  }

  async getCampaignEvents(campaignUuid: string) {
    return this.request(`/campaigns/${campaignUuid}/events`)
  }

  async getCampaignStagedLeads(campaignUuid: string): Promise<CampaignStagedLeadsResponse> {
    return this.request<CampaignStagedLeadsResponse>(`/campaigns/${campaignUuid}/staged-leads`)
  }

  async approveCampaignStagedLeads(campaignUuid: string, discoveredLeadIds: number[]): Promise<StagedLeadActionResponse> {
    return this.request<StagedLeadActionResponse>(`/campaigns/${campaignUuid}/staged-leads/approve`, {
      method: 'POST',
      body: JSON.stringify({ discovered_lead_ids: discoveredLeadIds }),
    })
  }

  async rejectCampaignStagedLeads(campaignUuid: string, discoveredLeadIds: number[]): Promise<StagedLeadActionResponse> {
    return this.request<StagedLeadActionResponse>(`/campaigns/${campaignUuid}/staged-leads/reject`, {
      method: 'POST',
      body: JSON.stringify({ discovered_lead_ids: discoveredLeadIds }),
    })
  }

  async refillCampaign(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/refill`, {
      method: 'POST',
    })
  }

  async resumeCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/resume`, {
      method: 'POST',
    })
  }

  async approveCampaignMessaging(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/approve-messaging`, {
      method: 'POST',
    })
  }

  async sendCampaignBatch(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/send-batch`, {
      method: 'POST',
    })
  }

  async pauseCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/pause`, {
      method: 'POST',
    })
  }

  async finishDiscoveryEarly(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/finish-discovery`, {
      method: 'POST',
    })
  }

  async updateCampaignDraft(draftUuid: string, data: { subject?: string; body?: string }): Promise<any> {
    return this.request(`/campaigns/drafts/${draftUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async polishCampaignDraft(draftUuid: string, notes: string): Promise<any> {
    return this.request(`/campaigns/drafts/${draftUuid}/polish`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    })
  }

  async deleteCampaign(campaignUuid: string): Promise<void> {
    await this.request<void>(`/campaigns/${campaignUuid}`, {
      method: 'DELETE',
    })
  }

  // ─── Scope Clarification ───────────────────────────────────────────────────

  async getScopeQuestions(projectId: number): Promise<{
    existing_scope: ScopeClarifiedScope | null
    questions: ScopeQuestion[] | null
    is_stale: boolean
  }> {
    return this.request(`/projects/${projectId}/scope-clarification`)
  }

  async submitScopeAnswers(projectId: number, payload: {
    answers: ScopeQuestionAnswer[]
    questions: ScopeQuestion[]
    trigger: string
  }): Promise<ScopeClarifiedScope> {
    return this.request(`/projects/${projectId}/scope-clarification/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async skipScopeSession(projectId: number): Promise<{ ok: boolean }> {
    return this.request(`/projects/${projectId}/scope-clarification/skip`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async generateClientPortal(clientId: number): Promise<{ token: string; url: string }> {
    return this.request(`/clients/${clientId}/generate-portal`, {
      method: 'POST',
    })
  }

  async getClientPortal(token: string) {
    return this.fetchPublic(`/projects/client/${token}`)
  }
}

class ContractorAIClient {
  private baseURL: string

  constructor(baseURL: string | undefined) {
    if (!baseURL) {
      throw new Error('Contractor AI API URL is not configured. Please set NEXT_PUBLIC_CONTRACTOR_AI_API_URL environment variable.')
    }
    // Normalize baseURL: remove trailing slashes
    this.baseURL = baseURL.replace(/\/+$/, '')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.baseURL) {
      throw new Error('Contractor AI API URL is not configured')
    }

    // Ensure endpoint starts with / and combine with baseURL
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseURL}${normalizedEndpoint}`

    // Create AbortController for timeout handling
    const controller = new AbortController()
    // Set timeout to 90 seconds
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    }

    console.log(`🌐 ContractorAI API: Making request to ${url}`)
    console.log(`🌐 ContractorAI API: Config:`, config)

    try {
      const response = await fetch(url, config)
      clearTimeout(timeoutId)

      console.log(`🌐 ContractorAI API: Response status: ${response.status}`)
      console.log(`🌐 ContractorAI API: Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let rawError = `HTTP ${response.status}: ${response.statusText}`
        try {
          const error = await response.json()
          rawError = error.error || error.message || rawError
        } catch (parseError) {
          console.error(`🌐 ContractorAI API: Failed to parse error response:`, parseError)
        }
        const isSpNotFound = response.status === 404 && String(rawError).toLowerCase().includes('service provider not found')
        if (isSpNotFound) {
          console.warn(`🌐 ContractorAI API: Service provider not found (linked contact may have been removed)`)
        } else {
          console.error(`🌐 ContractorAI API: Request failed:`, rawError)
        }
        const isTechnicalError = /sqlalchemy|psycopg|traceback|stacktrace|\[SQL:/i.test(rawError)
        const userMessage = isTechnicalError
          ? 'Something went wrong. Please try again.'
          : rawError
        throw new Error(userMessage)
      }

      if (response.status === 204) {
        console.log(`🌐 ContractorAI API: Success response (204 No Content)`)
        return {} as T
      }
      const data = await response.json()
      console.log(`🌐 ContractorAI API: Success response:`, data)
      return data
    } catch (error) {
      clearTimeout(timeoutId)

      console.error(`🌐 ContractorAI API: Request error for ${url}:`, error)
      if (error instanceof Error) {
        // Handle timeout/abort errors
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          throw new Error('Request timed out. The server took too long to respond. Please try again.')
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`Network error: Cannot connect to ${url}. Make sure the contractor-ai backend is running on the correct port.`)
        }
        throw error
      }
      throw new Error('Network error')
    }
  }

  async getLeads(params?: {
    sp_id?: string
    status?: string
    priority?: string
    service_type?: string
    days?: number
    page?: number
    per_page?: number
    lightweight?: boolean
    phone_number?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.sp_id) searchParams.append('sp_id', params.sp_id)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.service_type) searchParams.append('service_type', params.service_type)
    if (params?.days) searchParams.append('days', params.days.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
    if (params?.lightweight) searchParams.append('lightweight', 'true')
    if (params?.phone_number) searchParams.append('phone_number', params.phone_number)

    return this.request(`/leads?${searchParams.toString()}`)
  }

  async getLead(leadId: string) {
    return this.request(`/leads/${leadId}`)
  }

  async updateLead(leadId: string, data: any) {
    return this.request(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getConversations(params?: {
    sp_id?: string
    status?: string
    page?: number
    per_page?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.sp_id) searchParams.append('sp_id', params.sp_id)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())

    return this.request(`/conversations?${searchParams.toString()}`)
  }

  async getConversationMessages(conversationId: string, params?: {
    page?: number
    per_page?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())

    return this.request(`/conversations/${conversationId}/messages?${searchParams.toString()}`)
  }

  async sendMessage(conversationId: string, messageText: string) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message_text: messageText }),
    })
  }

  async getServiceProvider(spId: string) {
    return this.request(`/service-providers/${spId}`)
  }

  async getServiceProviderStats(spId: string, days = 30) {
    return this.request(`/service-providers/${spId}/stats?days=${days}`)
  }

  async getInteractionProjectSummary(interactionId: string): Promise<{
    project_summary: string | null
    project_type: string | null
    customer_number: string | null
    interaction_id: number
    message?: string
  }> {
    return this.request(`/interactions/${interactionId}/project-summary`)
  }

  async getCampaigns(): Promise<Campaign[]> {
    return this.request<Campaign[]>('/campaigns')
  }

  async getCampaign(campaignUuid: string): Promise<CampaignDetail> {
    return this.request<CampaignDetail>(`/campaigns/${campaignUuid}`)
  }

  async createCampaign(data: CampaignPayload): Promise<Campaign> {
    return this.request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCampaign(campaignUuid: string, data: Partial<CampaignPayload>): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async getCampaignForecast(data: DiscoveryForecastRequest): Promise<DiscoveryForecast> {
    return this.request<DiscoveryForecast>('/campaigns/discovery-forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateCampaignStrategies(data: GenerateCampaignStrategiesRequest): Promise<GenerateCampaignStrategiesResponse> {
    return this.request<GenerateCampaignStrategiesResponse>('/campaigns/generate-strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async generateCampaignBrief(campaignUuid: string): Promise<CampaignGenerateBriefResponse> {
    return this.request<CampaignGenerateBriefResponse>(`/campaigns/${campaignUuid}/generate-brief`, {
      method: 'POST',
    })
  }

  async approveCampaignBrief(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/approve-brief`, {
      method: 'POST',
    })
  }

  async launchCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/launch`, {
      method: 'POST',
    })
  }

  async getCampaignEvents(campaignUuid: string) {
    return this.request(`/campaigns/${campaignUuid}/events`)
  }

  async getCampaignStagedLeads(campaignUuid: string): Promise<CampaignStagedLeadsResponse> {
    return this.request<CampaignStagedLeadsResponse>(`/campaigns/${campaignUuid}/staged-leads`)
  }

  async approveCampaignStagedLeads(campaignUuid: string, discoveredLeadIds: number[]): Promise<StagedLeadActionResponse> {
    return this.request<StagedLeadActionResponse>(`/campaigns/${campaignUuid}/staged-leads/approve`, {
      method: 'POST',
      body: JSON.stringify({ discovered_lead_ids: discoveredLeadIds }),
    })
  }

  async rejectCampaignStagedLeads(campaignUuid: string, discoveredLeadIds: number[]): Promise<StagedLeadActionResponse> {
    return this.request<StagedLeadActionResponse>(`/campaigns/${campaignUuid}/staged-leads/reject`, {
      method: 'POST',
      body: JSON.stringify({ discovered_lead_ids: discoveredLeadIds }),
    })
  }

  async refillCampaign(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/refill`, {
      method: 'POST',
    })
  }

  async resumeCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/resume`, {
      method: 'POST',
    })
  }

  async approveCampaignMessaging(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/approve-messaging`, {
      method: 'POST',
    })
  }

  async sendCampaignBatch(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/send-batch`, {
      method: 'POST',
    })
  }

  async pauseCampaign(campaignUuid: string): Promise<Campaign> {
    return this.request<Campaign>(`/campaigns/${campaignUuid}/pause`, {
      method: 'POST',
    })
  }

  async deleteCampaign(campaignUuid: string): Promise<void> {
    await this.request<void>(`/campaigns/${campaignUuid}`, {
      method: 'DELETE',
    })
  }

  async healthCheck() {
    return this.request('/health')
  }

  // =========================
  // Follow-up System
  // =========================

  async getFollowupSettings(spId: string) {
    return this.request(`/followup/settings/${spId}`)
  }

  async updateFollowupSettings(spId: string, data: any) {
    return this.request(`/followup/settings/${spId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getScheduledFollowups(spId: string, params?: {
    status?: string
    type?: string
    page?: number
    per_page?: number
    limit?: number
    customer_number?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.customer_number) searchParams.append('customer_number', params.customer_number)

    const qs = searchParams.toString()
    return this.request(`/followup/scheduled/${spId}${qs ? `?${qs}` : ''}`)
  }

  async scheduleFollowup(data: {
    sp_id: number
    customer_number: string
    scheduled_for?: string
    message_text?: string
    followup_type?: string
    reference_type?: string
    reference_id?: number
    appointment_datetime?: string
  }) {
    return this.request('/followup/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async scheduleQuoteFollowup(data: {
    sp_id: number
    customer_number: string
    reference_type?: string
    reference_id?: number
    customer_name?: string
    quote_link?: string
  }) {
    return this.request('/followup/schedule-quote', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async cancelFollowup(followupId: string) {
    return this.request(`/followup/${followupId}`, {
      method: 'DELETE',
    })
  }

  async getFollowupTemplates(spId: string) {
    return this.request(`/followup/templates/${spId}`)
  }

  async sendImmediateSms(data: {
    sp_id: number
    customer_number: string
    message_text: string
    reference_type?: string
    reference_id?: number
  }) {
    return this.request('/followup/send-immediate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async attachProjectMedia(projectId: number, data: any) {
    return this.request(`/projects/${projectId}/media`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }


}

export const api = new ApiClient(API_URL!)
export const contractorAI = new ContractorAIClient(CONTRACTOR_AI_API_URL)
