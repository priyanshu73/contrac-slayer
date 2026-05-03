"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Phone, Mail, Building2, MapPin, Pencil, Archive, ArrowLeft, Briefcase, ExternalLink, Share2,
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import { ProjectTrade } from "@/lib/types"
import { useAuth } from "@/contexts/AuthContext"
import { EditTradeDialog } from "./projects/edit-trade-dialog"
import { TradeSendEmailDialog, TradeSendSmsDialog } from "./projects/trade-share-dialog"
import { AppBreadcrumb } from "./app-breadcrumb"

const SUB_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const

function getStatusColor(status: string) {
    switch (status) {
        case "ACTIVE": return "bg-green-100 text-green-800 border-green-200"
        case "INACTIVE": return "bg-yellow-100 text-yellow-800 border-yellow-200"
        case "ARCHIVED": return "bg-slate-100 text-slate-600 border-slate-200"
        default: return "bg-slate-100 text-slate-600 border-slate-200"
    }
}

interface SubcontractorDetailData {
    id: number
    uuid: string
    contractor_id: number
    name: string
    email?: string
    phone_number?: string
    company_name?: string
    specialty?: string | null
    address?: string
    address_id?: number
    status: string
    notes?: string
    created_at: string
    updated_at: string
    trades: ProjectTrade[]
}

export function SubcontractorDetail({ subcontractorId }: { subcontractorId: string }) {
    const router = useRouter()
    const locale = useLocale()
    const { toast } = useToast()
    const { user } = useAuth()

    const [subData, setSubData] = useState<SubcontractorDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)
    const [archiveOpen, setArchiveOpen] = useState(false)
    const [editTrade, setEditTrade] = useState<ProjectTrade | null>(null)
    const [sendEmailTrade, setSendEmailTrade] = useState<ProjectTrade | null>(null)
    const [sendSmsTrade, setSendSmsTrade] = useState<ProjectTrade | null>(null)
    const spId = user?.contractor_ai_sp_id ?? null

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone_number: "",
        company_name: "",
        specialty: "",
        address: "",
        notes: "",
        status: "ACTIVE",
    })

    useEffect(() => {
        fetchDetails()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcontractorId])

    const fetchDetails = async () => {
        try {
            setLoading(true)
            const data = await api.getSubcontractor(Number(subcontractorId))
            setSubData(data)
            setEditForm({
                name: data.name || "",
                email: data.email || "",
                phone_number: data.phone_number || "",
                company_name: data.company_name || "",
                specialty: data.specialty || "",
                address: data.address || "",
                notes: data.notes || "",
                status: data.status || "ACTIVE",
            })
        } catch (err: any) {
            toast({ title: "Failed to load crew member", description: err.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!subData) return
        try {
            const updated = await api.updateSubcontractor(subData.id, {
                name: editForm.name.trim() || undefined,
                email: editForm.email.trim() || undefined,
                phone_number: editForm.phone_number.trim() || undefined,
                company_name: editForm.company_name.trim() || undefined,
                specialty: editForm.specialty.trim() || undefined,
                address: editForm.address.trim() || undefined,
                notes: editForm.notes.trim() || undefined,
                status: editForm.status,
            })
            setSubData(updated)
            setEditOpen(false)
            toast({ title: "Crew member updated" })
        } catch (err: any) {
            toast({ title: "Update failed", description: err.message, variant: "destructive" })
        }
    }

    const handleArchive = async () => {
        if (!subData) return
        try {
            await api.deleteSubcontractor(subData.id)
            toast({ title: "Crew member archived" })
            router.push(`/${locale}/crew`)
        } catch (err: any) {
            toast({ title: "Archive failed", description: err.message, variant: "destructive" })
        } finally {
            setArchiveOpen(false)
        }
    }

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return "—"
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    const handleTradeUpdated = (updatedTrade: ProjectTrade) => {
        if (!subData) return
        setSubData({
            ...subData,
            trades: subData.trades.map(t => t.id === updatedTrade.id ? updatedTrade : t)
        })
    }

    const handleCopyScopeLink = async (trade: ProjectTrade) => {
        if (!trade?.uuid) return
        const frontendUrl = typeof window !== "undefined" ? window.location.origin : ""
        const fullUrl = `${frontendUrl}/${locale}/projects/trade/${trade.uuid}`
        try {
            await navigator.clipboard.writeText(fullUrl)
            toast({ title: "Link copied", description: "Scope link copied to clipboard." })
        } catch {
            toast({ title: "Failed to copy", variant: "destructive" })
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 md:p-12 lg:p-16">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
                    <div className="h-48 bg-white animate-pulse rounded-xl border border-slate-100" />
                    <div className="h-64 bg-white animate-pulse rounded-xl border border-slate-100" />
                </div>
            </div>
        )
    }

    if (!subData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">Crew member not found</h2>
                    <Button variant="outline" onClick={() => router.push(`/${locale}/crew`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contacts
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Breadcrumb */}
                    <AppBreadcrumb
                        items={[
                            { label: "Crew", href: `/${locale}/crew` },
                            { label: subData.name },
                        ]}
                    />

                    {/* Profile Card */}
                    <Card className="p-6 border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            {/* Avatar */}
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                                {subData.name[0].toUpperCase()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-xl font-bold text-slate-900">{subData.name}</h1>
                                    <Badge variant="outline" className={cn("text-xs", getStatusColor(subData.status))}>
                                        {subData.status}
                                    </Badge>
                                </div>
                                {(subData.company_name || subData.specialty) && (
                                    <div className="text-sm text-slate-500 mb-3 space-y-0.5">
                                        {subData.company_name && (
                                            <p>
                                                <Building2 className="h-3.5 w-3.5 inline mr-1" />
                                                {subData.company_name}
                                            </p>
                                        )}
                                        {subData.specialty && (
                                            <p className="text-xs font-medium text-blue-600">{subData.specialty}</p>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                                    {subData.email && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <a href={`mailto:${subData.email}`} className="hover:text-blue-600 transition-colors">
                                                {subData.email}
                                            </a>
                                        </div>
                                    )}
                                    {subData.phone_number && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                            <a href={`tel:${subData.phone_number}`} className="hover:text-blue-600 transition-colors">
                                                {subData.phone_number}
                                            </a>
                                        </div>
                                    )}
                                    {subData.address && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span>{subData.address}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-slate-400 mt-2 block">Added {formatDate(subData.created_at)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                                    <Pencil className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                {subData.status !== "ARCHIVED" && (
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setArchiveOpen(true)}>
                                        <Archive className="h-4 w-4 mr-1" /> Archive
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Notes */}
                    {subData.notes && (
                        <Card className="p-5 border border-slate-200">
                            <h3 className="font-semibold text-sm text-slate-700 mb-2">Notes</h3>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{subData.notes}</p>
                        </Card>
                    )}

                    {/* Assigned Trades / Scopes */}
                    <Card className="border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-slate-400" /> Managed Scopes & Pricing
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-bold">
                                {subData.trades?.length || 0} active scopes
                            </Badge>
                        </div>

                        {!subData.trades || subData.trades.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-sm text-slate-400">No work scopes found for this crew member.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {subData.trades.map((trade) => (
                                    <div key={trade.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex flex-col gap-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-bold text-slate-900">{trade.trade_type}</span>
                                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
                                                            trade.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                trade.status === 'PENDING_ACCEPTANCE' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                        )}>
                                                            {trade.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="font-medium text-blue-600 hover:underline cursor-pointer" onClick={() => router.push(`/${locale}/projects/${trade.project_id}`)}>
                                                            {trade.project_title || 'Unnamed Project'}
                                                        </span>
                                                        <span>•</span>
                                                        <span>Assigned {formatDate(trade.created_at)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="text-right mr-2">
                                                        <div className="text-sm font-bold text-slate-900">
                                                            {trade.agreed_price ? `$${Number(trade.agreed_price).toLocaleString()}` : <span className="text-slate-400 font-normal italic">No price set</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Agreed Budget</div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-3 text-slate-600"
                                                            >
                                                                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Scope
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => setSendEmailTrade(trade)}>
                                                                Send via Email
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setSendSmsTrade(trade)}>
                                                                Send via SMS
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleCopyScopeLink(trade)}>
                                                                Copy link
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-3 text-slate-600 hover:text-blue-600 border-slate-200"
                                                        onClick={() => setEditTrade(trade)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Scope
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Scope Preview */}
                                            {trade.scope_of_work ? (
                                                <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100">
                                                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed italic">
                                                        &ldquo;{trade.scope_of_work}&rdquo;
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 italic">No scope description provided.</p>
                                            )}

                                            {/* Quick Stats */}
                                            <div className="flex items-center gap-4 text-xs">
                                                <div className="flex items-center gap-1 text-slate-500">
                                                    <Briefcase className="h-3.5 w-3.5" />
                                                    {trade.tasks?.length || 0} Tasks
                                                </div>
                                                {trade.materials_required && trade.materials_required.length > 0 && (
                                                    <div className="flex items-center gap-1 text-slate-500">
                                                        <span className="font-medium text-slate-700">{trade.materials_required.length}</span> Materials listed
                                                    </div>
                                                )}
                                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-blue-600 py-0"
                                                        onClick={() => router.push(`/${locale}/projects/${trade.project_id}`)}
                                                    >
                                                        Go to project <ExternalLink className="h-3 w-3 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Trade Edit Dialog */}
            {editTrade && (
                <EditTradeDialog
                    open={!!editTrade}
                    onOpenChange={(open) => !open && setEditTrade(null)}
                    projectId={editTrade.project_id}
                    trade={editTrade}
                    onTradeUpdated={handleTradeUpdated}
                />
            )}

            <TradeSendEmailDialog
                open={!!sendEmailTrade}
                onOpenChange={(open) => !open && setSendEmailTrade(null)}
                trade={sendEmailTrade}
                projectTitle={sendEmailTrade?.project_title || "Project Scope"}
                locale={locale}
            />

            <TradeSendSmsDialog
                open={!!sendSmsTrade}
                onOpenChange={(open) => !open && setSendSmsTrade(null)}
                trade={sendSmsTrade}
                projectTitle={sendSmsTrade?.project_title || "Project Scope"}
                spId={spId}
                locale={locale}
            />

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Crew Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input id="edit-phone" value={editForm.phone_number} onChange={(e) => setEditForm((p) => ({ ...p, phone_number: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="edit-company">Company</Label>
                                <Input id="edit-company" value={editForm.company_name} onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-specialty">Specialty</Label>
                                <Input
                                    id="edit-specialty"
                                    placeholder="e.g. Plumbing"
                                    value={editForm.specialty}
                                    onChange={(e) => setEditForm((p) => ({ ...p, specialty: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-status">Status</Label>
                            <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                                <SelectTrigger id="edit-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUB_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea id="edit-notes" rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Archive Confirmation */}
            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive {subData.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will archive the crew member. You can reactivate them later from their profile.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
