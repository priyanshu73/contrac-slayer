'use client'

import { useEffect } from 'react'

export default function AdminPage() {
  useEffect(() => {
    // Get the Contractor AI API URL from environment variable
    let contractorAIUrl = process.env.NEXT_PUBLIC_CONTRACTOR_AI_API_URL || 'http://localhost:5000'
    
    // Strip /api from the URL if present
    contractorAIUrl = contractorAIUrl.replace(/\/api\/?$/, '')
    
    // Construct the admin URL
    const adminUrl = `${contractorAIUrl}`
    
    // Redirect to the backend admin page
    window.location.href = adminUrl
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Redirecting to Admin Panel...</h1>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}

