"use client"

import React, { useEffect, useState } from "react"
import { MapPin, Phone, User, CheckCircle2, ShieldAlert, Sparkles, Navigation } from "lucide-react"

export function DispatchPreview() {
  const [pulseLine, setPulseLine] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseLine(p => (p + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full font-sans max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden dark:bg-zinc-950 dark:border-zinc-800">
      {/* Header element simulating AI mode */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-200 animate-pulse" />
          <span className="font-semibold text-sm">Agentic Subcontractor Dispatch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-medium text-white/90">Autonomous Mode</span>
        </div>
      </div>
      
      {/* Main Content Space */}
      <div className="p-4 sm:p-5">
        {/* Project Context */}
        <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-start gap-3 mb-5 dark:bg-zinc-900/50 dark:border-zinc-800">
          <ShieldAlert className="h-6 w-6 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Emergency Dispatch Required</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Water heater burst at 104 Main St. Requires licensed plumber within 10 miles.</p>
          </div>
        </div>

        {/* Dispatch Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
            <Navigation className="h-3.5 w-3.5" /> AI Scanning Radius
          </div>

          {/* Sub 1 - Getting called by AI */}
          <div className="relative border-2 border-indigo-500 bg-indigo-50/50 rounded-xl p-3 sm:p-4 flex flex-col gap-3 overflow-hidden dark:bg-indigo-950/20 dark:border-indigo-500/50">
            {/* The pulsing AI wave background effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="h-full w-10 bg-indigo-600 blur-xl animate-[pulse_3s_ease-in-out_infinite] translate-x-1/2"></div>
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-full shadow flex items-center justify-center shrink-0 border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700">
                  <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h5 className="text-sm border-b border-transparent font-bold text-gray-900 dark:text-gray-100">David's Plumbing Pro</h5>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5 dark:text-gray-400">
                    <MapPin className="h-3 w-3" /> 2.4 miles away • Priority 1
                  </div>
                </div>
              </div>
              <div className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                <Phone className="h-3 w-3 animate-[ring_2s_infinite]" /> Voice AI Calling
              </div>
            </div>

            <div className="relative z-10 bg-white ml-2 border border-gray-100 rounded-lg p-2.5 text-xs dark:bg-zinc-900 dark:border-zinc-800">
              <div className="text-indigo-600 font-semibold mb-1 flex items-center gap-1 dark:text-indigo-400">
                <Sparkles className="h-3 w-3" /> Voice Agent Note
              </div>
              <p className="text-gray-600 dark:text-gray-400">"David, we have an emergency water heater leak 2 miles from you at 104 Main St. Can you dispatch immediately?"</p>
            </div>
          </div>

          {/* Sub 2 - Idle */}
          <div className="border border-gray-100 rounded-xl p-3 sm:p-4 flex items-center justify-between opacity-60 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0 border border-gray-100 dark:bg-zinc-900 dark:border-zinc-800">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Apex Water Systems</h5>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 dark:text-gray-500">
                  <MapPin className="h-3 w-3" /> 4.1 miles away • Priority 2
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Standby</div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/80 text-xs text-center text-gray-500 flex justify-center items-center gap-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-400">
        <CheckCircle2 className="h-4 w-4 text-green-500" /> AI automatically routes to the next available crew.
      </div>
    </div>
  )
}
