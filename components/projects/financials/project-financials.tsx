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
        <TabsList className="w-full flex overflow-x-auto flex-nowrap rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm">
          <TabsTrigger 
            value="job-costing" 
            className="h-11 min-w-[220px] flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Job Costing (Labour & Subs)
          </TabsTrigger>
          <TabsTrigger 
            value="materials"
            className="h-11 min-w-[220px] flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Materials & Permits
          </TabsTrigger>
          <TabsTrigger 
            value="summary"
            className="h-11 min-w-[220px] flex-1 cursor-pointer whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md"
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
