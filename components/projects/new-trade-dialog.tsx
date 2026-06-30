"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"
import { ProjectTrade, TeamMember } from "@/lib/types"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, UploadCloud, User, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface NewTradeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: number
    onTradeCreated: (trade: ProjectTrade) => void
}

type Assignee = {
    kind: "team" | "crew"
    id: number
    name: string
    subtitle?: string | null
    specialty?: string | null
}

export function NewTradeDialog({
    open,
    onOpenChange,
    projectId,
    onTradeCreated,
}: NewTradeDialogProps) {
    const t = useTranslations("projects.trades")
    const locale = useLocale()
    const { toast } = useToast()

    const [tradeType, setTradeType] = useState("")
    const [assignee, setAssignee] = useState<Assignee | null>(null)
    const [scopeOfWork, setScopeOfWork] = useState("")
    const [materials, setMaterials] = useState("")
    const [agreedPrice, setAgreedPrice] = useState("")

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [subcontractors, setSubcontractors] = useState<Array<{ subcontractor_id: number, subcontractor_name: string, subcontractor_email: string | null, phone_number: string | null, specialty?: string | null }>>([])
    const [uploadedFiles, setUploadedFiles] = useState<{ file: File, url: string }[]>([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [openCombobox, setOpenCombobox] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const tradeTypeRef = useRef<HTMLInputElement>(null)
    const assigneeRef = useRef<HTMLButtonElement>(null)
    const scopeRef = useRef<HTMLTextAreaElement>(null)
    const formScrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) {
            api.getAllSubcontractors().then(data => {
                setSubcontractors(data || [])
            }).catch(console.error)
            api.listTeamMembers().then(data => {
                // Only members who can actually own work (have an active account).
                setTeamMembers((data || []).filter(m => m.status === "ACTIVE"))
            }).catch(console.error)
        }
    }, [open])

    const resetForm = useCallback(() => {
        setTradeType("")
        setAssignee(null)
        setScopeOfWork("")
        setMaterials("")
        setAgreedPrice("")
        setUploadedFiles([])
        setSearchQuery("")
        setOpenCombobox(false)
    }, [])

    const handleOpenChange = (o: boolean) => {
        if (!o) resetForm()
        onOpenChange(o)
    }

    const teamLabel = (m: TeamMember) =>
        m.is_you ? "Me" : (m.full_name || m.email || m.invited_email || "Team member")

    const selectTeamMember = (m: TeamMember) => {
        setAssignee({
            kind: "team",
            id: m.id,
            name: teamLabel(m),
            subtitle: m.is_you ? (m.full_name || m.email || null) : m.email,
        })
        setOpenCombobox(false)
    }

    const selectSubcontractor = (s: typeof subcontractors[number]) => {
        setAssignee({
            kind: "crew",
            id: s.subcontractor_id,
            name: s.subcontractor_name,
            subtitle: [s.phone_number, s.subcontractor_email].filter(Boolean).join(" • ") || null,
            specialty: s.specialty,
        })
        if (!tradeType && s.specialty) setTradeType(s.specialty)
        setOpenCombobox(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                url: URL.createObjectURL(file)
            }))
            setUploadedFiles(prev => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setUploadedFiles(prev => {
            const copy = [...prev]
            URL.revokeObjectURL(copy[index].url)
            copy.splice(index, 1)
            return copy
        })
    }

    const handleSubmit = async () => {
        const missing: string[] = []
        if (!tradeType.trim()) missing.push("Trade Type")
        if (!assignee) missing.push("Assign To")
        if (!scopeOfWork.trim()) missing.push("Scope of Work")
        if (missing.length > 0) {
            toast({
                title: "Required fields missing",
                description: `Please fill: ${missing.join(", ")}. Scroll up if you don't see these fields.`,
                variant: "destructive",
            })
            // Scroll to first missing field so user sees it (they may have scrolled down to Materials/Price)
            requestAnimationFrame(() => {
                const el = !tradeType.trim()
                    ? tradeTypeRef.current
                    : !assignee
                        ? assigneeRef.current
                        : scopeRef.current
                el?.scrollIntoView({ behavior: "smooth", block: "center" })
            })
            return
        }

        setSubmitting(true)
        try {
            const created = (await api.createProjectTrade(projectId, {
                project_id: projectId,
                trade_type: tradeType,
                subcontractor_id: assignee!.kind === "crew" ? assignee!.id : undefined,
                team_member_id: assignee!.kind === "team" ? assignee!.id : undefined,
                scope_of_work: scopeOfWork,
                materials_required: materials.split("\n").map(m => m.trim()).filter(Boolean),
                agreed_price: agreedPrice ? parseFloat(agreedPrice) : undefined,
            })) as ProjectTrade

            if (uploadedFiles.length > 0) {
                try {
                    const filesToUpload = uploadedFiles.map(f => f.file)
                    await api.uploadProjectMedia(
                        projectId,
                        filesToUpload,
                        "TRADE_REFERENCE",
                        created.id
                    )
                } catch (err: any) {
                    toast({
                        title: "Media Upload Failed",
                        description: err?.message || "Trade was created but media failed to upload.",
                        variant: "destructive"
                    })
                }
            }

            toast({ title: "Trade scope added" })
            onTradeCreated(created)
            resetForm()
        } catch (err: any) {
            toast({
                title: "Error creating trade scope",
                description: err?.message,
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900">
                        Add New Trade / Scope
                    </DialogTitle>
                </DialogHeader>

                <div ref={formScrollRef} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Trade Type</Label>
                        <Input ref={tradeTypeRef} value={tradeType} onChange={e => setTradeType(e.target.value)} placeholder="e.g. Painting, Flooring" />
                    </div>

                    <div className="space-y-1.5 flex flex-col">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Assign To</Label>
                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    ref={assigneeRef}
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className="w-full justify-between font-normal text-left text-slate-700 bg-white hover:bg-slate-50 border-slate-200 h-10 px-3"
                                >
                                    <span className="truncate">
                                        {assignee ? assignee.name : <span className="text-slate-400">Select yourself, a team member, or crew...</span>}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start">
                                <Command>
                                    <CommandInput
                                        placeholder="Search people or crew..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        className="h-9"
                                    />
                                    <CommandList>
                                        <CommandEmpty>
                                            <span className="text-sm text-slate-500 px-2 py-1.5 block">No match found.</span>
                                        </CommandEmpty>

                                        {teamMembers.length > 0 && (
                                            <CommandGroup heading="Me / Team">
                                                {teamMembers.map(m => {
                                                    const label = teamLabel(m)
                                                    const selected = assignee?.kind === "team" && assignee.id === m.id
                                                    return (
                                                        <CommandItem
                                                            key={`team-${m.id}`}
                                                            value={`${label} ${m.email ?? ""}`}
                                                            className="items-start py-2"
                                                            onSelect={() => selectTeamMember(m)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5", selected ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="flex items-center gap-1.5">
                                                                    {m.is_you && <User className="h-3.5 w-3.5 text-blue-600" />}
                                                                    {label}
                                                                    <span className="text-xs text-slate-400">· {m.role.toLowerCase()}</span>
                                                                </span>
                                                                {(m.full_name || m.email) && (
                                                                    <span className="text-xs text-slate-500">
                                                                        {m.is_you ? (m.email ?? "") : (m.email ?? "")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        )}

                                        {subcontractors.length > 0 && (
                                            <CommandGroup heading="Crew">
                                                {subcontractors.map((s, idx) => {
                                                    const selected = assignee?.kind === "crew" && assignee.id === s.subcontractor_id
                                                    return (
                                                        <CommandItem
                                                            key={`crew-${s.subcontractor_id}-${idx}`}
                                                            value={s.subcontractor_name}
                                                            className="items-start py-2"
                                                            onSelect={() => selectSubcontractor(s)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5", selected ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span>{s.subcontractor_name}</span>
                                                                {(s.phone_number || s.subcontractor_email) && (
                                                                    <span className="text-xs text-slate-500">
                                                                        {[s.phone_number, s.subcontractor_email].filter(Boolean).join(" • ")}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-slate-500 px-1">
                            Don&apos;t see them? Add a new crew member on the{" "}
                            <Link href={`/${locale}/crew`} className="text-blue-600 hover:underline" target="_blank">
                                Crew page
                            </Link>
                            {" "}first.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Scope of Work</Label>
                        <textarea
                            ref={scopeRef}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            rows={4}
                            value={scopeOfWork}
                            onChange={e => setScopeOfWork(e.target.value)}
                            placeholder="Describe the scope for this trade..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Materials (One per line)</Label>
                        <textarea
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            rows={3}
                            value={materials}
                            onChange={e => setMaterials(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Agreed Price (Contractor Only)</Label>
                        <Input placeholder="e.g. $4,200.00" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </div>

                    <div className="rounded-xl border border-slate-200 mt-4 p-4">
                        <div className="flex items-center gap-2 mb-2 font-medium text-slate-800">
                            <UploadCloud className="h-5 w-5 text-blue-500" /> Upload Prep / Reference Attachments <span className="text-slate-400 font-normal text-sm">(optional)</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Upload reference photos or attachments for the assignee before assigning this scope.
                        </p>

                        <label className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer">
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*,application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={submitting}
                            />
                            <UploadCloud className="h-6 w-6 text-blue-500 mb-2" />
                            <p className="font-semibold text-slate-800">Drag & drop or click to select</p>
                            <p className="text-slate-500 text-sm">Photos, videos & PDFs accepted</p>
                        </label>

                        {uploadedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {uploadedFiles.map((f, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 group">
                                        {f.file.type.startsWith("image/") ? (
                                            <img src={f.url} alt={f.file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-1">
                                                <span className="text-xs font-medium text-slate-700 truncate w-full text-center">
                                                    {f.file.name.split('.').pop()?.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4 gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-[#0077CC] hover:bg-[#005FA3] text-white">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitting ? "Uploading..." : "+ Add Trade"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
