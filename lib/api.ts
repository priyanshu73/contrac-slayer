/**
 * API client layer for backend communication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
const CONTRACTOR_AI_API_URL = process.env.NEXT_PUBLIC_CONTRACTOR_AI_API_URL || 'http://localhost:5001/api'

console.log('🔧 API Configuration:')
console.log(`  Main API URL: ${API_URL}`)
console.log(`  Contractor AI URL: ${CONTRACTOR_AI_API_URL}`)

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for auth
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'An error occurred')
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  // Auth endpoints
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

  async getCurrentUser() {
    return this.request('/auth/me')
  }

  // Contractor profile endpoints
  async createContractorProfile(data: any) {
    return this.request('/contractors/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getMyProfile() {
    return this.request('/contractors/profile')
  }

  async updateProfile(data: any) {
    return this.request('/contractors/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
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
      throw new Error(error.detail || 'Failed to upload logo')
    }

    return response.json()
  }

  // Public contractor profile
  async getContractorProfile(contractorId: number) {
    return this.request(`/contractors/profile/${contractorId}`)
  }

  // Lead/Quote request endpoints
  async submitQuoteRequest(contractorId: number, data: any, files?: File[]) {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    if (data.address) formData.append('address', data.address)
    if (data.project_type) formData.append('project_type', data.project_type)
    if (data.description) formData.append('description', data.description)
    
    if (files) {
      files.forEach((file) => {
        formData.append('files', file)
      })
    }

    return fetch(`${this.baseURL}/contractors/${contractorId}/quote-request`, {
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

  // Jobs/Quotes endpoints
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

  // Client endpoints
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

  async updateClient(clientId: number, data: any) {
    return this.request(`/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Material search endpoints
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
}

class ContractorAIClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      // credentials: 'include', // Temporarily disable credentials for debugging
    }

    console.log(`🌐 ContractorAI API: Making request to ${url}`)
    console.log(`🌐 ContractorAI API: Config:`, config)

    try {
      const response = await fetch(url, config)

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
      console.error(`🌐 ContractorAI API: Request error for ${url}:`, error)
      if (error instanceof Error) {
        // Add more specific error information
        if (error.message.includes('Failed to fetch')) {
          throw new Error(`Network error: Cannot connect to ${url}. Make sure the contractor-ai backend is running on the correct port.`)
        }
        throw error
      }
      throw new Error('Network error')
    }
  }

  // Lead Management APIs
  async getLeads(params?: {
    status?: string
    priority?: string
    service_type?: string
    days?: number
    page?: number
    per_page?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.service_type) searchParams.append('service_type', params.service_type)
    if (params?.days) searchParams.append('days', params.days.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())

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

  // Conversation APIs
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

  // Service Provider APIs
  async getServiceProvider(spId: string) {
    return this.request(`/service-providers/${spId}`)
  }

  async getServiceProviderStats(spId: string, days = 30) {
    return this.request(`/service-providers/${spId}/stats?days=${days}`)
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }
}

export const api = new ApiClient(API_URL)
export const contractorAI = new ContractorAIClient(CONTRACTOR_AI_API_URL)

