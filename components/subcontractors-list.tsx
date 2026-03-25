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
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
    Phone, Mail, Building2, MapPin, MoreVertical, Archive,
    Briefcase, Clock,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { enUS, es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

export type SubcontractorsViewMode = "grid" | "list"

interface SubcontractorsListProps {
    subcontractors?: any[]
    loading?: boolean
    viewMode?: SubcontractorsViewMode
    onSubcontractorArchived?: () => void
}

function getStatusColor(status: string) {
    switch (status) {
        case "ACTIVE": return "bg-green-100 text-green-800 border-green-200"
        case "INACTIVE": return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "ARCHIVED": return "bg-slate-100 text-slate-600 border-slate-200"
        default: return "bg-slate-100 text-slate-600 border-slate-200"
    }
}

export function SubcontractorsList({
    subcontractors = [],
    loading = false,
    viewMode = "list",
    onSubcontractorArchived,
}: SubcontractorsListProps) {
    const router = useRouter()
    const locale = useLocale()
    const { toast } = useToast()
    const [archiveTarget, setArchiveTarget] = useState<number | null>(null)

    const handleRowClick = (id: number) => {
        router.push(`/${locale}/contacts/sub/${id}`)
    }

    const handleArchive = async () => {
        if (!archiveTarget) return
        try {
            await api.deleteSubcontractor(archiveTarget)
            toast({ title: "Crew member archived" })
            onSubcontractorArchived?.()
        } catch (err: any) {
            toast({ title: "Failed to archive", description: err.message, variant: "destructive" })
        } finally {
            setArchiveTarget(null)
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-white animate-pulse border border-slate-100" />
                ))}
            </div>
        )
    }

    if (subcontractors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-12 w-12 text-slate-300 mb-4" />
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
                            className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-slate-200"
                            onClick={() => handleRowClick(sub.id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                        {(sub.name || "?")[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm text-slate-900">{sub.name}</h3>
                                        {sub.company_name && (
                                            <p className="text-xs text-slate-500">{sub.company_name}</p>
                                        )}
                                    </div>
                                </div>
                                <Badge variant="outline" className={cn("text-xs", getStatusColor(sub.status))}>
                                    {sub.status}
                                </Badge>
                            </div>
                            <div className="space-y-1.5 text-xs text-slate-500">
                                {sub.email && (
                                    <div className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{sub.email}</span>
                                    </div>
                                )}
                                {sub.phone_number && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" />
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
                            <AlertDialogTitle>Archive crew member?</AlertDialogTitle>
                            <AlertDialogDescription>This will archive the crew member. You can reactivate them later.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )
    }

    // List view (default)
    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_140px_140px_48px] gap-4 px-4 py-2.5 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <span>Name</span>
                    <span>Contact</span>
                    <span>Company</span>
                    <span>Status</span>
                    <span />
                </div>
                {subcontractors.map((sub, idx) => (
                    <div
                        key={sub.id}
                        className={cn(
                            "grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_140px_48px] gap-2 sm:gap-4 px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors",
                            idx !== subcontractors.length - 1 && "border-b border-slate-100"
                        )}
                        onClick={() => handleRowClick(sub.id)}
                    >
                        {/* Name */}
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                {(sub.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm text-slate-900 truncate">{sub.name}</p>
                                {sub.company_name && (
                                    <p className="text-xs text-slate-400 truncate sm:hidden">{sub.company_name}</p>
                                )}
                            </div>
                        </div>
                        {/* Contact */}
                        <div className="text-xs text-slate-500 space-y-0.5 hidden sm:block">
                            {sub.email && <div className="truncate">{sub.email}</div>}
                            {sub.phone_number && <div>{sub.phone_number}</div>}
                        </div>
                        {/* Company */}
                        <div className="text-xs text-slate-500 truncate hidden sm:block">{sub.company_name || "—"}</div>
                        {/* Status */}
                        <div className="hidden sm:block">
                            <Badge variant="outline" className={cn("text-xs", getStatusColor(sub.status))}>
                                {sub.status}
                            </Badge>
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
                                    <DropdownMenuItem onClick={() => setArchiveTarget(sub.id)}>
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>

            <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive crew member?</AlertDialogTitle>
                        <AlertDialogDescription>This will archive the crew member. You can reactivate them later.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
