/**
 * API client layer for backend communication
 */

import { User, ContractorProfile } from './types'

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
    if (typeof detail === 'string') return detail
    if (typeof detail === 'object') {
      const maybe = detail as Record<string, any>
      if (typeof maybe.message === 'string') return maybe.message
      if (typeof maybe.error === 'string') return maybe.error
      try {
        return JSON.stringify(detail)
      } catch {
        return 'An error occurred'
      }
    }
    return String(detail)
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

  async getContractorProfile(contractorId: number) {
    return this.request(`/contractors/profile/${contractorId}`)
  }

  async getContractorProfileByUuid(contractorUuid: string) {
    return this.request(`/contractors/profile/uuid/${contractorUuid}`)
  }

  async submitQuoteRequest(contractorUuid: string, data: any, files?: File[], measurements?: { items: any[] }) {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    if (data.address) formData.append('address', data.address)
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

  async getMyJobs(status?: string, skip = 0, limit = 20) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    return this.request(`/jobs?${params.toString()}`)
  }

  async getJob(jobId: number) {
    return this.request(`/jobs/${jobId}`)
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

  async getClients(skip = 0, limit = 20) {
    const params = new URLSearchParams()
    params.append('skip', skip.toString())
    params.append('limit', limit.toString())

    return this.request(`/clients?${params.toString()}`)
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
    labor_rate_per_hour?: number
    markup_percentage?: number
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

  // =========================
  // NeetoCal (proxied via backend)
  // =========================
  async getNeetoBookings(params?: {
    // preferred (matches NeetoCal docs)
    page_size?: number
    page_number?: number
    type?: string
    host_email?: string
    client_email?: string
    sorting_order?: string
    // legacy
    take?: number
    cursor?: string
    status?: string
    team_member_email?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.page_number) searchParams.append('page_number', params.page_number.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.host_email) searchParams.append('host_email', params.host_email)
    if (params?.client_email) searchParams.append('client_email', params.client_email)
    if (params?.sorting_order) searchParams.append('sorting_order', params.sorting_order)

    if (params?.take) searchParams.append('take', params.take.toString())
    if (params?.cursor) searchParams.append('cursor', params.cursor)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.team_member_email) searchParams.append('team_member_email', params.team_member_email)
    const qs = searchParams.toString()
    return this.request(`/neetocal/bookings${qs ? `?${qs}` : ''}`)
  }

  async getNeetoAvailabilities(team_member_email?: string) {
    const searchParams = new URLSearchParams()
    if (team_member_email) searchParams.append('team_member_email', team_member_email)
    const qs = searchParams.toString()
    return this.request(`/neetocal/availabilities${qs ? `?${qs}` : ''}`)
  }

  async createNeetoAvailability(payload: any) {
    return this.request(`/neetocal/availabilities`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    })
  }

  // Clean endpoint alias (backend proxies to NeetoCal)
  async createAvailability(payload: any) {
    return this.request(`/availabilities`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    })
  }

  async getAvailabilities() {
    return this.request(`/availabilities`)
  }

  async getSingleAvailability() {
    return this.request(`/availability`)
  }

  async getAvailabilityTimeZone() {
    return this.request(`/availability/timezone`)
  }

  async upsertSingleAvailability(payload: any) {
    return this.request(`/availability`, {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    })
  }

  async updateNeetoAvailability(availability_sid: string, payload: any) {
    return this.request(`/neetocal/availabilities/${availability_sid}`, {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    })
  }

  async getNeetoAvailableSlots(params?: {
    meeting_sid?: string
    meeting_slug?: string
    date?: string
    timezone?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.meeting_sid) searchParams.append('meeting_sid', params.meeting_sid)
    if (params?.meeting_slug) searchParams.append('meeting_slug', params.meeting_slug)
    if (params?.date) searchParams.append('date', params.date)
    if (params?.timezone) searchParams.append('timezone', params.timezone)
    const qs = searchParams.toString()
    return this.request(`/neetocal/available-slots${qs ? `?${qs}` : ''}`)
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
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (parseError) {
          console.error(`🌐 ContractorAI API: Failed to parse error response:`, parseError)
        }
        console.error(`🌐 ContractorAI API: Request failed:`, errorMessage)
        throw new Error(errorMessage)
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

  async healthCheck() {
    return this.request('/health')
  }
}

export const api = new ApiClient(API_URL!)
export const contractorAI = new ContractorAIClient(CONTRACTOR_AI_API_URL)
