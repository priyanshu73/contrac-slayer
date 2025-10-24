"use client"

import { useSearchParams } from "next/navigation"
import { QuoteCreator } from "@/components/Quote-creator"
import { AuthGuard } from "@/components/auth-guard"

export default function NewJobPage() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("leadId")

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create Quote</h1>
            <p className="text-gray-600 mt-2">
              {leadId 
                ? "From Lead - AI-powered pricing and material suggestions" 
                : "Create a new quote with AI-powered pricing and material suggestions"
              }
            </p>
          </div>
          <QuoteCreator leadId={leadId} />
        </div>
      </div>
    </AuthGuard>
  )
}
