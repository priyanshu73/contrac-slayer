'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Project, ProjectCostItem, ProjectMaterial, ProjectPayment, ProjectFinancialSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Home, Plus } from 'lucide-react'
import { FinancialSidebar } from './financial-sidebar'
import { JobCostingTab } from './job-costing-tab'
import { MaterialsPermitsTab } from './materials-permits-tab'
import { SummaryInvoicingTab } from './summary-invoicing-tab'

interface ProjectFinancialsProps {
  project: Project
  onProjectUpdated?: () => Promise<void> | void
}

export function ProjectFinancials({ project, onProjectUpdated }: ProjectFinancialsProps) {
  const { toast } = useToast()
  
  // Shared state that multiple components might need
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<ProjectPayment[]>([])
  const [summary, setSummary] = useState<ProjectFinancialSummary | null>(null)
  
  // Fetch overarching data that the sidebar needs
  const refreshFinancialData = async () => {
    try {
      setLoading(true)
      const [paymentsData, summaryData] = await Promise.all([
        api.getProjectPayments(project.id),
        api.getProjectFinancialSummary(project.id)
      ])
      setPayments(paymentsData)
      setSummary(summaryData)
    } catch (err: any) {
      toast({
        title: 'Error loading financials',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshFinancialData()
  }, [project.id])

  if (loading && !summary) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <Tabs defaultValue="job-costing" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full flex overflow-x-auto flex-nowrap">
          <TabsTrigger 
            value="job-costing" 
            className="flex-1 whitespace-nowrap data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            Job Costing (Labour & Subs)
          </TabsTrigger>
          <TabsTrigger 
            value="materials"
            className="flex-1 whitespace-nowrap data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            Materials & Permits
          </TabsTrigger>
          <TabsTrigger 
            value="summary"
            className="flex-1 whitespace-nowrap data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            Summary & Invoicing
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area (Tabs) */}
          <div className="flex-1 min-w-0">            <div className="bg-white rounded-lg border shadow-sm">
              <TabsContent value="job-costing" className="p-0 m-0 border-none outline-none">
                <JobCostingTab project={project} onRefreshTotal={refreshFinancialData} />
              </TabsContent>

              <TabsContent value="materials" className="p-0 m-0 border-none outline-none">
                <MaterialsPermitsTab
                  project={project}
                  onRefreshTotal={refreshFinancialData}
                  onProjectMediaChanged={onProjectUpdated}
                />
              </TabsContent>

              <TabsContent value="summary" className="p-0 m-0 border-none outline-none">
                {summary && <SummaryInvoicingTab project={project} summary={summary} />}
              </TabsContent>
            </div>
          </div>

          {/* Persistent Right Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
          <FinancialSidebar 
            project={project} 
            payments={payments} 
            summary={summary} 
            onPaymentAdded={refreshFinancialData} 
          />
        </div>
      </div>
      </Tabs>
    </div>
  )
}
