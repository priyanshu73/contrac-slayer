"use client"

import { useState, useEffect } from "react"
import { SubcontractorsList } from "@/components/subcontractors-list"
import { AddSubcontractorForm } from "@/components/add-subcontractor-form"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Plus, LayoutGrid, List } from "lucide-react"

export type ClientsViewMode = "grid" | "list"

export default function CrewPage() {
  const [subcontractors, setSubcontractors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ClientsViewMode>("list")
  const [addSubOpen, setAddSubOpen] = useState(false)

  useEffect(() => {
    fetchSubcontractors()
  }, [])

  const fetchSubcontractors = async () => {
    try {
      setLoading(true)
      const data = await api.getSubcontractors()
      setSubcontractors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch subcontractors:", error)
      setSubcontractors([])
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering
  const filteredSubcontractors = subcontractors.filter((sub) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = (sub.name || "").toLowerCase()
    const email = (sub.email || "").toLowerCase()
    const phone = (sub.phone_number || "").toLowerCase()
    const company = (sub.company_name || "").toLowerCase()
    return name.includes(query) || email.includes(query) || phone.includes(query) || company.includes(query)
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm md:sticky md:top-0 md:z-10">
        <div className="px-4 py-4 sm:px-8 sm:py-4 md:px-12 lg:px-16">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crew</h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500 md:hidden">
                  {loading ? "Loading..." : `${filteredSubcontractors.length} crew members`}
                </p>
              </div>
              <Button
                className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold md:hidden"
                onClick={() => setAddSubOpen(true)}
              >
                <Plus className="h-5 w-5 shrink-0" />
                Add
              </Button>
            </div>

            {/* Search + Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Search crew..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-10 sm:max-w-xs sm:text-sm sm:shadow-none"
                />
              </div>

              <div className="hidden w-full items-center gap-2 sm:flex sm:w-auto sm:gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex h-10 w-10 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-md transition-colors touch-manipulation ${
                      viewMode === "list" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    title="List view"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex h-10 w-10 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-md transition-colors touch-manipulation ${
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  className="flex-1 sm:flex-initial h-11 min-h-[44px] sm:min-h-0 touch-manipulation"
                  onClick={() => setAddSubOpen(true)}
                >
                  <Plus className="h-5 w-5 shrink-0 mr-2" />
                  Add Crew Member
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          <SubcontractorsList
            subcontractors={filteredSubcontractors}
            loading={loading}
            viewMode={viewMode}
            onSubcontractorDeleted={fetchSubcontractors}
            onSubcontractorUpdated={fetchSubcontractors}
          />
        </div>

        <AddSubcontractorForm
          open={addSubOpen}
          onOpenChange={setAddSubOpen}
          onSuccess={fetchSubcontractors}
        />
      </main>
    </div>
  )
}
