"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { api, contractorAI } from "@/lib/api"
import { CustomerRequestForm } from "@/components/customer-request-form"
import { Card } from "@/components/ui/card"
import Image from "next/image"

export interface PrefillData {
  name?: string
  phone?: string
  address?: string
  description?: string
  project_type?: string
}

export default function PublicQuoteRequestPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const contractorUuid = params.contractorId as string
  const interactionId = searchParams.get('interaction_id')
  const sessionUuid = searchParams.get('session_uuid')

  const [contractor, setContractor] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await api.getContractorProfileByUuid(contractorUuid)
        setContractor(profile)

        // Pre-fill from Nova voice session (preferred) or legacy call interaction
        if (sessionUuid) {
          setPrefillLoading(true)
          try {
            const summary = await contractorAI.getVoiceSessionProjectSummary(sessionUuid)
            if (summary.project_summary || summary.caller_name || summary.caller_phone || summary.caller_address) {
              setPrefillData({
                name: summary.caller_name || '',
                phone: summary.caller_phone || '',
                address: summary.caller_address || '',
                description: summary.project_summary || '',
              })
            }
          } catch (prefillErr) {
            console.warn('Could not fetch voice session summary for pre-fill:', prefillErr)
          } finally {
            setPrefillLoading(false)
          }
        } else if (interactionId) {
          setPrefillLoading(true)
          try {
            const summary = await contractorAI.getInteractionProjectSummary(interactionId)
            if (summary.project_summary) {
              setPrefillData({
                description: summary.project_summary,
                project_type: summary.project_type || '',
                phone: summary.customer_number || '',
              })
            }
          } catch (prefillErr) {
            console.warn('Could not fetch interaction summary for pre-fill:', prefillErr)
          } finally {
            setPrefillLoading(false)
          }
        }
      } catch (err: any) {
        setError("Contractor not found")
      } finally {
        setIsLoading(false)
      }
    }

    if (contractorUuid) {
      fetchData()
    }
  }, [contractorUuid, interactionId, sessionUuid])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-white">
        <div className="relative">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-sky-600 text-center animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-white p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contractor Not Found</h1>
          <p className="text-muted-foreground">The contractor you're looking for doesn't exist or is no longer available.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Intentionally minimal header (contractor info is shown inside the form) */}

      {/* Form Section */}
      <CustomerRequestForm 
        contractor={contractor} 
        contractorUuid={contractorUuid}
        prefillData={prefillData}
        prefillLoading={prefillLoading}
      />
    </div>
  )
}

