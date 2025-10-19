"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { CustomerRequestForm } from "@/components/customer-request-form"
import { Card } from "@/components/ui/card"

export default function PublicQuoteRequestPage() {
  const params = useParams()
  const contractorId = parseInt(params.contractorId as string)
  const [contractor, setContractor] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchContractor = async () => {
      try {
        const profile = await api.getContractorProfile(contractorId)
        setContractor(profile)
      } catch (err: any) {
        setError("Contractor not found")
      } finally {
        setIsLoading(false)
      }
    }

    if (contractorId) {
      fetchContractor()
    }
  }, [contractorId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Contractor Not Found</h1>
          <p className="text-muted-foreground">The contractor you're looking for doesn't exist.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <CustomerRequestForm contractorId={contractorId} contractorName={contractor.company_name} />
    </div>
  )
}

