"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import {
    Phone, Mail, Building2, MapPin, MoreVertical, Trash2,
    Clock, Wrench, ChevronUp, ChevronDown, Link2
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

export type SubcontractorsViewMode = "grid" | "list"

interface SubcontractorsListProps {
    subcontractors?: any[]
    loading?: boolean
    viewMode?: SubcontractorsViewMode
    onSubcontractorDeleted?: () => void
    onSubcontractorUpdated?: () => void
}

function getAvailabilityBadge(status: string) {
    switch (status) {
        case "AVAILABLE": 
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><Clock className="w-3 h-3 mr-1" /> Available</span>
        case "UNAVAILABLE": 
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><Clock className="w-3 h-3 mr-1" /> Unavailable</span>
        case "PENDING": 
        default: 
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>
    }
}

export function SubcontractorsList({
    subcontractors = [],
    loading = false,
    viewMode = "list",
    onSubcontractorDeleted,
    onSubcontractorUpdated,
}: SubcontractorsListProps) {
    const router = useRouter()
    const locale = useLocale()
    const { toast } = useToast()
    const [archiveTarget, setArchiveTarget] = useState<number | null>(null)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    const handleRowClick = (id: number) => {
        router.push(`/${locale}/contacts/sub/${id}`)
    }

    const handleCopyAvailabilityLink = (e: React.MouseEvent, uuid: string) => {
        e.stopPropagation()
        if (!uuid) return
        const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const fullUrl = `${frontendUrl}/${locale}/availability/${uuid}`
        navigator.clipboard.writeText(fullUrl).then(() => {
            toast({ title: "Link Copied", description: "Availability link copied to clipboard." })
        }).catch(() => {
            toast({ title: "Failed to copy", variant: "destructive" })
        })
    }

    const handleDelete = async () => {
        if (!archiveTarget) return
        try {
            await api.deleteSubcontractor(archiveTarget)
            toast({ title: "Crew member deleted" })
            onSubcontractorDeleted?.()
        } catch (err: any) {
            toast({ title: "Failed to delete", description: err.message, variant: "destructive" })
        } finally {
            setArchiveTarget(null)
        }
    }

    const updatePriority = async (e: React.MouseEvent, id: number, currentList: any[], change: number) => {
        e.stopPropagation()
        
        const currentIndex = currentList.findIndex(s => s.id === id)
        if (currentIndex === -1) return
        
        const targetIndex = currentIndex + change // -1 is UP, 1 is DOWN
        if (targetIndex < 0 || targetIndex >= currentList.length) return
        
        const currentSub = currentList[currentIndex]
        const targetSub = currentList[targetIndex]
        
        // Self-heal algorithm: force their DB priorities to rigorously snap to their target physical indices
        const newPriorityForCurrent = targetIndex + 1
        const newPriorityForTarget = currentIndex + 1

        try {
            setUpdatingId(id)
            await Promise.all([
                api.updateSubcontractor(id, { dispatch_priority: newPriorityForCurrent }),
                api.updateSubcontractor(targetSub.id, { dispatch_priority: newPriorityForTarget })
            ])
            toast({ title: "Dispatch priority updated" })
            onSubcontractorUpdated?.()
        } catch (err: any) {
            toast({ title: "Failed to update priority", description: err.message, variant: "destructive" })
        } finally {
            setUpdatingId(null)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2].map((i) => (
                    <div key={i} className="space-y-3">
                        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
                        <div className="h-20 rounded-xl bg-white animate-pulse border border-slate-100" />
                        <div className="h-20 rounded-xl bg-white animate-pulse border border-slate-100" />
                    </div>
                ))}
            </div>
        )
    }

    if (subcontractors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Wrench className="h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No crew yet</h3>
                <p className="text-sm text-slate-500">Add your first crew member to get started.</p>
            </div>
        )
    }

    // Grid view
    if (viewMode === "grid") {
        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subcontractors.map((sub) => (
                        <Card
                            key={sub.id}
                            className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-slate-200 relative group"
                            onClick={() => handleRowClick(sub.id)}
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => handleCopyAvailabilityLink(e, sub.uuid)}>
                                            <Link2 className="h-4 w-4 mr-2" />
                                            Request Availability
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setArchiveTarget(sub.id)} className="text-red-600 focus:text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-start justify-between mb-3 pr-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                        {(sub.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm text-slate-900 truncate">{sub.name}</h3>
                                        {sub.company_name && (
                                            <p className="text-xs text-slate-500 truncate">{sub.company_name}</p>
                                        )}
                                        {sub.specialty && (
                                            <p className="text-xs font-medium text-blue-600 mt-0.5 truncate">{sub.specialty}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-slate-500">
                                {sub.email && (
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{sub.email}</span>
                                    </div>
                                )}
                                {sub.phone_number && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span>{sub.phone_number}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete crew member?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the crew member. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )
    }

    // List view (grouped dispatch style)
    const UNCATEGORIZED_KEY = "Uncategorized"

    // Group by specialty
    const grouped = subcontractors.reduce((acc, sub) => {
        const spec = sub.specialty || "Uncategorized"
        if (!acc[spec]) acc[spec] = []
        acc[spec].push(sub)
        return acc
    }, {} as Record<string, any[]>)

    // Sort specialties alphabetically, but always keep "Uncategorized" last.
    const sortedSpecialties = Object.keys(grouped).sort((a, b) => {
        const aIsUncategorized = a === UNCATEGORIZED_KEY
        const bIsUncategorized = b === UNCATEGORIZED_KEY
        if (aIsUncategorized && !bIsUncategorized) return 1
        if (!aIsUncategorized && bIsUncategorized) return -1
        return a.localeCompare(b)
    })

    // Sort subcontractors in each group.
    sortedSpecialties.forEach(key => {
        grouped[key].sort((a: any, b: any) => {
            const pa = a.dispatch_priority ?? 999
            const pb = b.dispatch_priority ?? 999
            if (pa !== pb) return pa - pb
            return (a.name || "").localeCompare(b.name || "")
        })
    })

    return (
        <div className="space-y-8">
            {sortedSpecialties.map(specialty => (
                <div key={specialty} className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1 flex items-center">
                        <Wrench className="w-4 h-4 mr-2 text-slate-400" />
                        {specialty}
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                            {grouped[specialty].length}
                        </span>
                    </h3>
                    
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="hidden sm:grid grid-cols-[80px_1.5fr_1.5fr_1.5fr_48px] gap-4 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            <span className="text-center">Dispatch</span>
                            <span>Crew Member</span>
                            <span>Location & Availability</span>
                            <span>Contact Info</span>
                            <span />
                        </div>
                        
                        {grouped[specialty].map((sub: any, idx: number) => {
                            const currentGroupList = grouped[specialty]
                            // The visual rank should simply be the physical 1..N order of the list for the category
                            const effectivePriority = idx + 1
                            const isFirst = idx === 0
                            const isLast = idx === currentGroupList.length - 1
                            
                            return (
                                <div
                                    key={sub.id}
                                    className={cn(
                                        "grid grid-cols-1 sm:grid-cols-[80px_1.5fr_1.5fr_1.5fr_48px] gap-3 sm:gap-4 px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors",
                                        idx !== currentGroupList.length - 1 && "border-b border-slate-100"
                                    )}
                                    onClick={() => handleRowClick(sub.id)}
                                >
                                    {/* Priority Controls */}
                                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-100 sm:bg-transparent sm:border-0" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            type="button"
                                            disabled={updatingId === sub.id || isFirst}
                                            onClick={(e) => updatePriority(e, sub.id, currentGroupList, -1)}
                                            className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                                            title="Increase Priority (Move Up)"
                                        >
                                            <ChevronUp className="w-5 h-5" />
                                        </button>
                                        <div className="text-sm font-bold text-slate-700 w-8 text-center flex items-center justify-center">
                                            {updatingId === sub.id ? (
                                                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                            ) : (
                                                `#${effectivePriority}`
                                            )}
                                        </div>
                                        <button 
                                            type="button"
                                            disabled={updatingId === sub.id || isLast}
                                            onClick={(e) => updatePriority(e, sub.id, currentGroupList, 1)}
                                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                                            title="Decrease Priority (Move Down)"
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    {/* Crew Member Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                            {(sub.name || "?")[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 truncate">{sub.name}</p>
                                            {sub.company_name && (
                                                <p className="text-xs text-slate-500 truncate flex items-center mt-0.5">
                                                    <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                                    {sub.company_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Location & Availability */}
                                    <div className="space-y-1.5 hidden sm:block">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">{sub.address || "No address on file"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getAvailabilityBadge(sub.daily_availability_status)}
                                            {sub.service_radius_miles && (
                                                <span className="text-xs text-slate-500">
                                                    ({sub.service_radius_miles} mi radius)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Location & Availability */}
                                    <div className="sm:hidden space-y-1 mt-1 border-t border-slate-100 pt-2">
                                        {getAvailabilityBadge(sub.daily_availability_status)}
                                        {sub.address && (
                                            <p className="text-xs text-slate-500 truncate flex items-center mt-1">
                                                <MapPin className="w-3 h-3 mr-1 shrink-0" />
                                                {sub.address}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Contact */}
                                    <div className="text-xs text-slate-500 space-y-1.5 sm:block flex gap-3 sm:gap-0 mt-1 sm:mt-0">
                                        {sub.email && (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{sub.email}</span>
                                            </div>
                                        )}
                                        {sub.phone_number && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{sub.phone_number}</span>
                                            </div>
                                        )}
                                        {!sub.email && !sub.phone_number && (
                                            <span className="text-slate-400 italic">No contact info</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="hidden sm:flex justify-end" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => handleCopyAvailabilityLink(e, sub.uuid)}>
                                                    <Link2 className="h-4 w-4 mr-2" />
                                                    Request Availability
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setArchiveTarget(sub.id)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete crew member?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the crew member. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
