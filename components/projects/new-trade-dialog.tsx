"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ProjectTrade } from "@/lib/types"
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
import { Loader2, UploadCloud, X } from "lucide-react"

interface NewTradeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: number
    onTradeCreated: (trade: ProjectTrade) => void
}

export function NewTradeDialog({
    open,
    onOpenChange,
    projectId,
    onTradeCreated,
}: NewTradeDialogProps) {
    const t = useTranslations("projects.trades")
    const { toast } = useToast()

    const [tradeType, setTradeType] = useState("Painting")
    const [subcontractorName, setSubcontractorName] = useState("")
    const [contactInfo, setContactInfo] = useState("")
    const [scopeOfWork, setScopeOfWork] = useState("")
    const [materials, setMaterials] = useState("")
    const [agreedPrice, setAgreedPrice] = useState("")

    const [uploadedFiles, setUploadedFiles] = useState<{ file: File, url: string }[]>([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const resetForm = useCallback(() => {
        setTradeType("Painting")
        setSubcontractorName("")
        setContactInfo("")
        setScopeOfWork("")
        setMaterials("")
        setAgreedPrice("")
        setUploadedFiles([])
    }, [])

    const handleOpenChange = (o: boolean) => {
        if (!o) resetForm()
        onOpenChange(o)
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
        if (!tradeType.trim() || !subcontractorName.trim() || !scopeOfWork.trim()) {
            toast({ title: "Trade Type, Subcontractor Name, and Scope are required", variant: "destructive" })
            return
        }

        setSubmitting(true)
        try {
            const created = (await api.createProjectTrade(projectId, {
                project_id: projectId,
                trade_type: tradeType,
                subcontractor_name: subcontractorName,
                contact_info: contactInfo,
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

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Trade Type</Label>
                        <Input value={tradeType} onChange={e => setTradeType(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Subcontractor Name</Label>
                        <Input placeholder="e.g. Henry Reyes" value={subcontractorName} onChange={e => setSubcontractorName(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Contact Info</Label>
                        <Input placeholder="e.g. (512) 555-0192" value={contactInfo} onChange={e => setContactInfo(e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Scope of Work</Label>
                        <textarea
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            rows={4}
                            value={scopeOfWork}
                            onChange={e => setScopeOfWork(e.target.value)}
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
                            Upload reference photos or attachments for the subcontractor before assigning this scope.
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
