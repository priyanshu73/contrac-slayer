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
  QBOInvoiceDetail,
  QBOProjectInvoiceDetailResponse,
  StagedLeadActionResponse,
  User,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
const CONTRACTOR_AI_API_URL = process.env.NEXT_PUBLIC_CONTRACTOR_AI_API_URL

console.log('🔧 API Configuration:')
console.log(`  Main API URL: ${API_URL}`)
console.log(`  Contractor AI URL: ${CONTRACTOR_AI_API_URL}`)

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    // Create AbortController for timeout handling
    const controller = new AbortController()
    // Set timeout to 90 seconds (longer than backend timeout to get proper error)
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      signal: controller.signal,
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
          throw new Error('Request timed out. The server took too long to respond. Please try again.')
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
    search?: string
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

  async getJobByPublicLink(publicLink: string) {
    // Public endpoint - don't require authentication
    const url = `${this.baseURL}/jobs/public/${publicLink}`

    const config: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't include credentials for public endpoint
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(this.formatApiErrorDetail(error?.detail))
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
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
    location_zip_code?: string
    labor_charge_type?: string
    labor_rate_value?: number
    labor_unit_type?: string
  }) {
    console.log(`🤖 API Client: Generating AI estimate`)
    const startTime = Date.now()

    try {
      const result = await this.request('/generate-estimate', {
        method: 'POST',
        body: JSON.stringify(data),
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
    // Public endpoint but safe to use standard request helper (credentials included)
    return this.request(`/jobs/${jobId}/sign/customer`, {
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

  async launchCampaign(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/launch`, {
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

  async launchCampaign(campaignUuid: string): Promise<CampaignLaunchResponse> {
    return this.request<CampaignLaunchResponse>(`/campaigns/${campaignUuid}/launch`, {
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
