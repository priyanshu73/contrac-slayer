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

    const [uploadedImages, setUploadedImages] = useState<
        { url: string; name: string; size: number }[]
    >([])
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const resetForm = useCallback(() => {
        setTradeType("Painting")
        setSubcontractorName("")
        setContactInfo("")
        setScopeOfWork("")
        setMaterials("")
        setAgreedPrice("")
        setUploadedImages([])
    }, [])

    const handleOpenChange = (o: boolean) => {
        if (!o) resetForm()
        onOpenChange(o)
    }

    const openCloudinaryWidget = () => {
        if (typeof window === "undefined") return
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        if (!cloudName) {
            toast({ title: "Image upload not configured", variant: "destructive" })
            return
        }

        setUploading(true)
        // @ts-ignore
        if (window.cloudinary) {
            // @ts-ignore
            const widget = window.cloudinary.createUploadWidget(
                {
                    cloudName,
                    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default",
                    sources: ["local", "camera"],
                    multiple: true,
                    resourceType: "auto",
                },
                (error: any, result: any) => {
                    if (result?.event === "success") {
                        setUploadedImages((prev) => [
                            ...prev,
                            {
                                url: result.info.secure_url,
                                name: result.info.original_filename + "." + result.info.format,
                                size: result.info.bytes,
                            },
                        ])
                    }
                    if (result?.event === "close" || result?.event === "abort" || error) {
                        setUploading(false)
                    }
                }
            )
            widget.open()
        } else {
            const url = prompt("Enter media URL:")
            if (url) {
                setUploadedImages((prev) => [
                    ...prev,
                    { url, name: "uploaded-media", size: 0 },
                ])
            }
            setUploading(false)
        }
    }

    const removeImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
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

            for (const img of uploadedImages) {
                try {
                    await api.attachProjectMedia(projectId, {
                        trade_id: created.id,
                        file_url: img.url,
                        file_name: img.name,
                        file_size: img.size,
                        media_type: "PHOTO",
                        context: "TRADE_REFERENCE",
                    })
                } catch {
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
                            <UploadCloud className="h-5 w-5 text-blue-500" /> Upload Prep / Reference Media <span className="text-slate-400 font-normal text-sm">(optional)</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Upload reference photos or video instructions for the subcontractor before assigning this scope.
                        </p>
                        <button
                            onClick={openCloudinaryWidget}
                            disabled={uploading}
                            className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center hover:bg-slate-100 transition-colors"
                        >
                            {uploading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mb-2" />
                            ) : (
                                <UploadCloud className="h-6 w-6 text-blue-500 mb-2" />
                            )}
                            <p className="font-semibold text-slate-800">Drag & drop or click to select</p>
                            <p className="text-slate-500 text-sm">Photos & videos accepted</p>
                        </button>
                        {uploadedImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {uploadedImages.map((img, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 group">
                                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(i)}
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
                        + Add Trade
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
