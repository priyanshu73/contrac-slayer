"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { CustomerRequestForm } from "@/components/customer-request-form"
import { Card } from "@/components/ui/card"
import Image from "next/image"

export default function PublicQuoteRequestPage() {
  const params = useParams()
  const contractorUuid = params.contractorId as string
  const [contractor, setContractor] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchContractor = async () => {
      try {
        const profile = await api.getContractorProfileByUuid(contractorUuid)
        setContractor(profile)
      } catch (err: any) {
        setError("Contractor not found")
      } finally {
        setIsLoading(false)
      }
    }

    if (contractorUuid) {
      fetchContractor()
    }
  }, [contractorUuid])

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
      {/* Clean Header */}


      {/* Instructions Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
          <div className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Help Us Help You Get the Best Quote</h2>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  The more details you provide, the more accurate and competitive your quote will be. Our AI-powered system analyzes your information to deliver precise estimates tailored to your specific project.
                </p>
                
                <div className="bg-white/60 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Include These Details for the Most Accurate Quote:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Measurements:</strong> Dimensions, square footage, linear feet</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Photos:</strong> Current conditions, problem areas, site access</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Timeline:</strong> Preferred start date, completion deadlines</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Materials:</strong> Specific preferences, quality requirements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Special needs:</strong> Access limitations, permits, utilities</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700"><strong>Budget range:</strong> Helps us recommend appropriate options</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">More details = More accurate pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-medium">Faster turnaround time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Form Section */}
      <CustomerRequestForm contractor={contractor} contractorUuid={contractorUuid} />
    </div>
  )
}

