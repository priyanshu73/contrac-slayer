/**
 * API client layer for backend communication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

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
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Material search endpoints
  async searchMaterials(query: string, zipCode?: string, maxResults = 10) {
    const params = new URLSearchParams()
    params.append('query', query)
    if (zipCode) params.append('location_zip_code', zipCode)
    params.append('max_results', maxResults.toString())

    return this.request(`/intelligent/materials/search?${params.toString()}`, {
      method: 'POST',
    })
  }
}

export const api = new ApiClient(API_URL)

