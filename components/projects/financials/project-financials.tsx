'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Project, ProjectPayment, ProjectFinancialSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Home, Plus } from 'lucide-react'
import { FinancialSidebar } from './financial-sidebar'
import { CostsMarginTab } from './costs-margin-tab'
import { ScopeBillingTab } from './scope-billing-tab'

interface ProjectFinancialsProps {
  project: Project
  onProjectUpdated?: () => Promise<void> | void
}

export function ProjectFinancials({ project, onProjectUpdated }: ProjectFinancialsProps) {
  const { toast } = useToast()
  
  // Shared state that multiple components might need
  const [activeTab, setActiveTab] = useState('scope-billing')
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1.5 rounded-xl border border-border bg-muted p-1.5 shadow-sm sm:grid-cols-2">
          <TabsTrigger
            value="scope-billing"
            className="h-10 cursor-pointer whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Billing &amp; Invoices
          </TabsTrigger>
          <TabsTrigger
            value="costs-margin"
            className="h-10 cursor-pointer whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Costs &amp; Margin
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area (Tabs) */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-lg border shadow-sm">
              <TabsContent value="scope-billing" className="p-0 m-0 border-none outline-none">
                <ScopeBillingTab project={project} />
              </TabsContent>

              <TabsContent value="costs-margin" className="p-0 m-0 border-none outline-none">
                <CostsMarginTab
                  project={project}
                  summary={summary}
                  onRefreshTotal={refreshFinancialData}
                  onProjectMediaChanged={onProjectUpdated}
                />
              </TabsContent>
            </div>
          </div>

          {/* Right Sidebar (Billing & Invoices only) */}
          {activeTab === 'scope-billing' && (
            <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
              <FinancialSidebar
                project={project}
                payments={payments}
                summary={summary}
                onPaymentAdded={refreshFinancialData}
              />
            </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}
