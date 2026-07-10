'use client'

import { useState } from 'react'
import { Project, ProjectFinancialSummary } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pencil } from 'lucide-react'
import { JobCostsSection } from './job-costing-tab'
import { LaborSection } from './labor-section'
import { MaterialsPermitsTab } from './materials-permits-tab'

interface CostsMarginTabProps {
  project: Project
  summary: ProjectFinancialSummary | null
  onRefreshTotal: () => void
  onProjectMediaChanged?: () => Promise<void> | void
}

// Backend Decimal fields arrive as strings over JSON — coerce before any math.
const toNum = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const toNumOrNull = (v: any): number | null => { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null }
const pct = (v: any) => { const n = toNum(v); return `${Number.isInteger(n) ? n : n.toFixed(1)}%` }
const num = (v: any) => { const n = toNum(v); return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '') }

/**
 * Costs & Margin — the merged job P&L tab. A headline Job Margin block (revenue
 * from the contract, all costs summed, with the derivation of every figure shown)
 * sits above the cost breakdown: direct & indirect job cost, labor, and materials.
 * Cost-only throughout — no per-line client price (revenue lives on the billing side).
 */
export function CostsMarginTab({ project, summary, onRefreshTotal, onProjectMediaChanged }: CostsMarginTabProps) {
  const { toast } = useToast()
  const [savingPnl, setSavingPnl] = useState(false)
  const [pnlOpen, setPnlOpen] = useState(false)

  const revenue = toNum(summary?.total_project_value)
  const directCost = toNum(summary?.total_direct_cost)
  const indirectCost = toNum(summary?.total_indirect_cost)
  const laborCost = toNum(summary?.total_labor)
  const materialsCost = toNum(summary?.total_materials)
  const totalCost = summary?.total_job_cost != null ? toNum(summary.total_job_cost) : (directCost + indirectCost + laborCost + materialsCost)
  const grossProfit = summary?.gross_profit != null ? toNum(summary.gross_profit) : (revenue - totalCost)
  const margin = summary?.gross_margin_pct != null ? toNum(summary.gross_margin_pct) : (revenue > 0 ? (grossProfit / revenue) * 100 : 0)
  const gpPerUnit = toNumOrNull(summary?.gp_per_unit)
  const gpPerCrewDay = toNumOrNull(summary?.gp_per_crew_day)
  // Breakeven Day Rate (sheet: "cost/day to zero out") — the loaded crew-day
  // cost at which GP hits zero: (Revenue − every cost except labor) ÷ crew days.
  // Pay your crew more per day than this and the job loses money.
  const unitLabel = (summary?.pnl_unit_label || '').trim()
  const unitWord = unitLabel || 'unit'
  const unitCount = toNumOrNull(summary?.pnl_unit_count)
  const crewDays = toNumOrNull(summary?.pnl_crew_days)
  const breakevenDayRate = crewDays != null && crewDays > 0
    ? (revenue - (totalCost - laborCost)) / crewDays
    : null

  const profitClass = grossProfit >= 0 ? 'text-status-active' : 'text-destructive'
  const plural = (n: number | null, w: string) => `${w}${n === 1 ? '' : 's'}`

  const savePnl = async (updates: Record<string, any>) => {
    try {
      setSavingPnl(true)
      await api.updateProject(project.id, updates)
      onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Could not save', description: err.message, variant: 'destructive' })
    } finally {
      setSavingPnl(false)
    }
  }

  const parseNum = (raw: string): number | null => {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (cleaned === '') return null
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }

  // Small stat tile with a derivation caption underneath.
  const tile = (label: string, value: string, formula: string, valueClass = 'text-foreground', extra?: React.ReactNode) => (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{label}</p>
        {extra}
      </div>
      <p className={`text-lg font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground/80 tabular-nums truncate">{formula}</p>
    </div>
  )

  // Compact editable caption for the per-unit inputs.
  const pnlSummaryText = (unitCount != null || crewDays != null)
    ? [
        unitCount != null ? `${num(unitCount)} ${plural(unitCount, unitWord.toLowerCase())}` : null,
        crewDays != null ? `${num(crewDays)} crew ${plural(crewDays, 'day')}` : null,
      ].filter(Boolean).join(' · ')
    : 'Set units & crew days'

  return (
    <div>
      {/* JOB MARGIN */}
      <div className="p-6 pb-0">
        <Card className="border shadow-sm">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Job Margin</h2>
              {/* Compact editable P&L inputs */}
              <Popover open={pnlOpen} onOpenChange={setPnlOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" /> {pnlSummaryText}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Per-unit metric inputs</p>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Unit label</Label>
                    <Input
                      className="h-8 text-sm"
                      placeholder="e.g. Pond"
                      defaultValue={unitLabel}
                      onBlur={e => { const v = e.target.value.trim(); if (v !== unitLabel) savePnl({ pnl_unit_label: v || null }) }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground"># Units</Label>
                      <Input
                        type="text" inputMode="decimal" className="h-8 text-sm text-right" placeholder="0"
                        defaultValue={unitCount != null ? String(unitCount) : ''}
                        onBlur={e => { const v = parseNum(e.target.value); if (v !== unitCount) savePnl({ pnl_unit_count: v }) }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground"># Crew days</Label>
                      <Input
                        type="text" inputMode="decimal" className="h-8 text-sm text-right" placeholder="0"
                        defaultValue={crewDays != null ? String(crewDays) : ''}
                        onBlur={e => { const v = parseNum(e.target.value); if (v !== crewDays) savePnl({ pnl_crew_days: v }) }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{savingPnl ? 'Saving…' : 'Drives GP per unit / crew day below.'}</p>
                </PopoverContent>
              </Popover>
            </div>

            {/* Hero: Gross Profit + Margin */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Gross Profit</p>
                <p className={`text-3xl font-bold tabular-nums leading-tight ${profitClass}`}>{formatCurrency(grossProfit)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  Revenue {formatCurrency(revenue)} − Cost {formatCurrency(totalCost)}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Gross Margin</p>
                <p className={`text-3xl font-bold tabular-nums leading-tight ${profitClass}`}>{pct(margin)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Gross Profit ÷ Revenue</p>
              </div>
            </div>

            {/* Per-unit tiles — the sheet's GP per Pond / GP per Crew Day / Breakeven rows */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {tile(
                `Gross Profit per ${unitWord}`,
                gpPerUnit != null ? formatCurrency(gpPerUnit) : '—',
                unitCount != null ? `GP ÷ ${num(unitCount)} ${plural(unitCount, unitWord.toLowerCase())}` : 'Set # units',
              )}
              {tile(
                'Gross Profit per Crew Day',
                gpPerCrewDay != null ? formatCurrency(gpPerCrewDay) : '—',
                crewDays != null ? `GP ÷ ${num(crewDays)} crew ${plural(crewDays, 'day')}` : 'Set # crew days',
              )}
              {tile(
                'Breakeven Day Rate',
                breakevenDayRate != null ? formatCurrency(breakevenDayRate) : '—',
                breakevenDayRate != null
                  ? 'Loaded crew-day cost above this = job loses money.'
                  : 'Set # crew days',
                'text-destructive',
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COST BREAKDOWN */}
      <div className="space-y-6 p-6">
        <JobCostsSection project={project} onRefreshTotal={onRefreshTotal} />
        <LaborSection project={project} onRefreshTotal={onRefreshTotal} />
        <MaterialsPermitsTab
          project={project}
          onRefreshTotal={onRefreshTotal}
          onProjectMediaChanged={onProjectMediaChanged}
        />
      </div>
    </div>
  )
}
