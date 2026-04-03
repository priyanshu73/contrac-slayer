"use client"

import React from "react"
import { DollarSign, CheckCircle2, TrendingUp, Download, RefreshCw } from "lucide-react"

export function JobCostingPreview() {
  return (
    <div className="w-full font-sans max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
      {/* Header element simulating Financials/QuickBooks sync */}
      <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <span className="font-semibold text-sm">Smart Job Costing</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-700/50 px-2 py-1 rounded text-xs font-medium border border-emerald-500/30">
          <RefreshCw className="h-3 w-3 animate-spin duration-3000" /> QB Synced
        </div>
      </div>
      
      {/* Main Content Space */}
      <div className="p-3 sm:p-5">
        {/* Margin Highlight */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center justify-between mb-5 dark:bg-zinc-900/50 dark:border-zinc-800">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">Total Contract Value</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5 dark:text-gray-100">$24,500.00</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400">GC Profit Margin</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5 flex items-center gap-1 justify-end dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" /> 32% ($7,840)
            </div>
          </div>
        </div>

        {/* Line Items Table Mockup */}
        <div className="border border-gray-100 rounded-lg overflow-hidden text-sm dark:border-zinc-800">
          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-600 uppercase border-b border-gray-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-gray-400">
            <div>Line Item</div>
            <div className="flex gap-4 sm:gap-8">
              <div className="w-16 text-right">GC Cost</div>
              <div className="w-16 text-right">Client $</div>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {/* Row 1 */}
            <div className="px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950">
              <div className="truncate pr-2">
                <div className="font-medium text-gray-900 dark:text-gray-100">Rough Plumbing</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> David's Plumbing</div>
              </div>
              <div className="flex gap-4 sm:gap-8 shrink-0">
                <div className="w-16 text-right text-gray-600 font-medium dark:text-gray-300">$3,500</div>
                <div className="w-16 text-right text-gray-900 font-semibold dark:text-gray-100">$4,550</div>
              </div>
            </div>
            {/* Row 2 */}
            <div className="px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950">
              <div className="truncate pr-2">
                <div className="font-medium text-gray-900 dark:text-gray-100">Electrical Wiring</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">Unassigned <span className="bg-red-50 text-red-600 px-1 rounded border border-red-100 dark:bg-red-900/30 dark:border-red-900/50">Needs Sub</span></div>
              </div>
              <div className="flex gap-4 sm:gap-8 shrink-0">
                <div className="w-16 text-right text-gray-600 font-medium dark:text-gray-300">$2,800</div>
                <div className="w-16 text-right text-gray-900 font-semibold dark:text-gray-100">$3,640</div>
              </div>
            </div>
            {/* Row 3 */}
            <div className="px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950">
              <div className="truncate pr-2">
                <div className="font-medium text-gray-900 dark:text-gray-100">Drywall & Tape</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> JD Drywall</div>
              </div>
              <div className="flex gap-4 sm:gap-8 shrink-0">
                <div className="w-16 text-right text-gray-600 font-medium dark:text-gray-300">$1,500</div>
                <div className="w-16 text-right text-gray-900 font-semibold dark:text-gray-100">$2,100</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/80 text-xs text-center flex justify-center items-center gap-3 dark:border-zinc-800 dark:bg-zinc-900">
         <span className="text-gray-500 font-medium flex items-center gap-1 dark:text-gray-400">
           <Download className="h-3 w-3" /> Auto-generates Client PDF
         </span>
         <span className="text-gray-300 dark:text-zinc-700">|</span>
         <span className="text-emerald-600 font-medium flex items-center gap-1 dark:text-emerald-500">
           Syncs to QuickBooks
         </span>
      </div>
    </div>
  )
}
