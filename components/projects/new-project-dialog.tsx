"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
    Search,
    ChevronDown,
    User,
    Calendar,
    Loader2,
    X,
} from "lucide-react"

interface Client {
    id: number
    name: string
    phone?: string
    email?: string
}

interface NewProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onProjectCreated: (projectId: number) => void
    defaultClientId?: number
}

export function NewProjectDialog({
    open,
    onOpenChange,
    onProjectCreated,
    defaultClientId,
}: NewProjectDialogProps) {
    const t = useTranslations("projects.newProjectDialog")
    const { toast } = useToast()

    // Form state
    const [title, setTitle] = useState("")
    const [objective, setObjective] = useState("")
    const [clientId, setClientId] = useState<number | null>(defaultClientId ?? null)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [submitting, setSubmitting] = useState(false)

    // Clients dropdown
    const [clients, setClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(false)
    const [clientSearch, setClientSearch] = useState("")
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

    const clientRef = useRef<HTMLDivElement>(null)

    // Load clients when dialog opens
    useEffect(() => {
        if (!open) return
        const loadData = async () => {
            setLoadingClients(true)
            try {
                const clientsData = await api.getClients(0, 100)
                const items = Array.isArray(clientsData)
                    ? clientsData
                    : (clientsData as any)?.items ?? []
                setClients(items)
            } catch (err) {
                console.error("Failed to load clients", err)
            } finally {
                setLoadingClients(false)
            }
        }
        loadData()
    }, [open])

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
                setClientDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setTitle("")
            setObjective("")
            setClientId(defaultClientId ?? null)
            setStartDate("")
            setEndDate("")
            setClientSearch("")
        }
    }, [open])

    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return clients
        const q = clientSearch.toLowerCase()
        return clients.filter(
            (c) =>
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
        )
    }, [clients, clientSearch])

    const selectedClient = clients.find((c) => c.id === clientId)

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({
                title: t("validation.titleRequired"),
                variant: "destructive",
            })
            return
        }
        setSubmitting(true)
        try {
            const payload: Record<string, any> = { title: title.trim() }
            if (objective.trim()) payload.objective = objective.trim()
            if (clientId) payload.client_id = clientId
            if (startDate) payload.scheduled_start_date = startDate
            if (endDate) payload.scheduled_end_date = endDate

            const created = (await api.createProject(payload)) as any
            if (created?.id) {
                toast({ title: t("successTitle"), description: t("successDesc") })
                onProjectCreated(created.id)
                onOpenChange(false)
            }
        } catch (err: any) {
            toast({
                title: t("errorTitle"),
                description: err?.message || t("errorDesc"),
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-slate-900">
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="project-title" className="text-sm font-medium text-slate-700">
                            {t("fields.title")} <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            id="project-title"
                            placeholder={t("fields.titlePlaceholder")}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-slate-200"
                        />
                    </div>

                    {/* Objective / Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="project-objective" className="text-sm font-medium text-slate-700">
                            {t("fields.objective")}
                        </Label>
                        <textarea
                            id="project-objective"
                            rows={3}
                            placeholder={t("fields.objectivePlaceholder")}
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Client dropdown */}
                    <div className="space-y-1.5" ref={clientRef}>
                        <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {t("fields.client")}
                        </Label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                                className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300 transition-colors text-left"
                            >
                                {selectedClient ? (
                                    <span className="truncate text-slate-900">
                                        {selectedClient.name}
                                        {selectedClient.phone && (
                                            <span className="text-slate-400 ml-1.5">
                                                · {selectedClient.phone}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-slate-400">
                                        {loadingClients
                                            ? t("fields.loadingClients")
                                            : t("fields.selectClient")}
                                    </span>
                                )}
                                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                            </button>

                            {selectedClient && (
                                <button
                                    type="button"
                                    className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setClientId(null)
                                        setClientSearch("")
                                    }}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}

                            {clientDropdownOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-48 overflow-hidden">
                                    <div className="p-2 border-b border-slate-100">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={t("fields.searchClients")}
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-36 overflow-y-auto">
                                        {filteredClients.length === 0 ? (
                                            <p className="px-3 py-2 text-sm text-slate-400">
                                                {t("fields.noClients")}
                                            </p>
                                        ) : (
                                            filteredClients.map((c) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${c.id === clientId ? "bg-slate-50 font-medium" : ""
                                                        }`}
                                                    onClick={() => {
                                                        setClientId(c.id)
                                                        setClientDropdownOpen(false)
                                                        setClientSearch("")
                                                    }}
                                                >
                                                    <span className="text-slate-900">{c.name}</span>
                                                    {c.phone && (
                                                        <span className="text-slate-400 ml-2 text-xs">
                                                            {c.phone}
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Date pickers */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="start-date"
                                className="text-sm font-medium text-slate-700 flex items-center gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {t("fields.startDate")}
                            </Label>
                            <Input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="end-date"
                                className="text-sm font-medium text-slate-700 flex items-center gap-1.5"
                            >
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {t("fields.endDate")}
                            </Label>
                            <Input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-slate-200"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !title.trim()}
                        className="min-w-[120px]"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("creating")}
                            </>
                        ) : (
                            t("create")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
