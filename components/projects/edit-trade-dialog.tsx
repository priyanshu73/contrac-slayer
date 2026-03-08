"use client"

import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { ProjectTrade, ProjectMedia } from "@/lib/types"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Trash2, UploadCloud, X, Zap } from "lucide-react"

interface EditTradeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: number
    trade: ProjectTrade | null
    onTradeUpdated: (trade: ProjectTrade) => void
}

export function EditTradeDialog({
    open,
    onOpenChange,
    projectId,
    trade,
    onTradeUpdated,
}: EditTradeDialogProps) {
    const t = useTranslations("projects.trades")
    const { toast } = useToast()

    const [scopeOfWork, setScopeOfWork] = useState("")
    const [materials, setMaterials] = useState("")
    const [agreedPrice, setAgreedPrice] = useState("")
    const [acceptanceCriteria, setAcceptanceCriteria] = useState<{ text: string, selected: boolean }[]>([])

    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (open && trade) {
            setScopeOfWork(trade.scope_of_work || "")
            setMaterials(trade.materials_required?.join("\n") || "")
            setAgreedPrice(trade.agreed_price?.toString() || "")
            setAcceptanceCriteria(trade.acceptance_criteria || [])
        } else {
            setScopeOfWork("")
            setMaterials("")
            setAgreedPrice("")
            setAcceptanceCriteria([])
        }
    }, [open, trade])

    const handleOpenChange = (o: boolean) => {
        onOpenChange(o)
    }

    const handleToggleCriteria = (idx: number) => {
        setAcceptanceCriteria(prev =>
            prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c)
        )
    }

    const openCloudinaryWidget = () => {
        if (typeof window === "undefined" || !trade) return
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
                async (error: any, result: any) => {
                    if (result?.event === "success") {
                        try {
                            const attachRes = await api.attachProjectMedia(projectId, {
                                trade_id: trade.id,
                                file_url: result.info.secure_url,
                                file_name: result.info.original_filename + "." + result.info.format,
                                file_size: result.info.bytes,
                                media_type: "PHOTO",
                                context: "TRADE_REFERENCE",
                            }) as ProjectMedia

                            const updatedTrade = {
                                ...trade,
                                reference_media: [...(trade.reference_media || []), attachRes]
                            }
                            onTradeUpdated(updatedTrade)
                            toast({ title: "Media uploaded" })
                        } catch (err: any) {
                            toast({ title: "Error saving media reference", variant: "destructive" })
                        }
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
                // mock logic
                api.attachProjectMedia(projectId, {
                    trade_id: trade.id,
                    file_url: url,
                    file_name: "uploaded-file",
                    file_size: 0,
                    media_type: "PHOTO",
                    context: "TRADE_REFERENCE",
                }).then(attachRes => {
                    const updatedTrade = {
                        ...trade,
                        reference_media: [...(trade.reference_media || []), attachRes as ProjectMedia]
                    }
                    onTradeUpdated(updatedTrade)
                }).finally(() => setUploading(false))
            } else {
                setUploading(false)
            }
        }
    }

    const handleSubmit = async () => {
        if (!trade || !scopeOfWork.trim()) {
            toast({ title: "Scope is required", variant: "destructive" })
            return
        }

        setSubmitting(true)
        try {
            const updated = (await api.updateProjectTrade(projectId, trade.id, {
                scope_of_work: scopeOfWork,
                materials_required: materials.split("\n").map(m => m.trim()).filter(Boolean),
                agreed_price: agreedPrice ? parseFloat(agreedPrice) : undefined,
                acceptance_criteria: acceptanceCriteria,
            })) as ProjectTrade

            toast({ title: "Trade scope updated" })
            onTradeUpdated({ ...trade, ...updated })
            onOpenChange(false)
        } catch (err: any) {
            toast({
                title: "Error updating trade scope",
                description: err?.message,
                variant: "destructive",
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (!trade) return null

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto px-0 bg-slate-50">
                <DialogHeader className="px-6 py-2 pb-0">
                    <DialogTitle className="text-xl font-semibold text-slate-900">
                        Edit Scope — {trade.trade_type}
                    </DialogTitle>
                    <div className="text-sm text-slate-500">Sub: {trade.subcontractor_name}</div>
                </DialogHeader>

                <div className="space-y-4 py-2 px-6">
                    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-4 pb-2">
                        <Label className="text-sm font-semibold text-slate-700 uppercase p-1">Scope of Work</Label>
                        <textarea
                            className="w-full bg-slate-100 rounded-md border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 px-3 py-2 text-sm text-slate-900 resize-none h-24"
                            value={scopeOfWork}
                            onChange={e => setScopeOfWork(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-4 pb-2">
                        <Label className="text-sm font-semibold text-slate-700 uppercase p-1">Materials Required (One per line)</Label>
                        <textarea
                            className="w-full bg-slate-100 rounded-md border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 px-3 py-2 text-sm text-slate-900 resize-none h-24"
                            value={materials}
                            onChange={e => setMaterials(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5 bg-white border border-slate-200 rounded-lg p-4">
                        <Label className="text-sm font-semibold text-slate-700 uppercase p-1">Agreed Price (Contractor Only)</Label>
                        <Input className="bg-slate-100" placeholder="e.g. $4,200.00" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </div>

                    <div className="bg-white border text-sm text-slate-800 border-slate-200 rounded-lg p-4 pb-2 relative">
                        <div className="flex items-center justify-between mb-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2"><Zap className="text-blue-500 w-4 h-4" /> AI-Suggested Acceptance Criteria </div>
                            <div className="font-normal text-xs text-slate-500">Click to add/remove</div>
                        </div>

                        <div className="space-y-2 mb-2">
                            {acceptanceCriteria.map((c, i) => (
                                <button key={i} onClick={() => handleToggleCriteria(i)} className={`w-full justify-start text-left items-center p-3 border rounded-lg transition-colors flex gap-2 ${c.selected ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                                    {c.selected ? <span className="text-blue-500 text-lg">✓</span> : <span className="text-slate-400 text-lg">+</span>}
                                    {c.text}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="mt-4">
                    <Tabs defaultValue="gc" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 rounded-none bg-slate-100/50 p-0 border-t border-slate-200 h-14">
                            <TabsTrigger value="gc" className="rounded-none font-semibold text-slate-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-b-blue-500 h-full">
                                <UploadCloud className="w-4 h-4 mr-2" /> GC Prep Media <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{trade.reference_media?.length || 0}</span>
                            </TabsTrigger>
                            <TabsTrigger value="sub" className="rounded-none font-semibold text-slate-500 data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 h-full">
                                Sub Proof-of-Work <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{trade.proof_of_work_media?.length || 0}</span>
                            </TabsTrigger>
                        </TabsList>
                        <div className="bg-white">
                            <TabsContent value="gc" className="m-0 p-6 space-y-4 border-b border-slate-200">
                                <p className="text-sm text-slate-500">
                                    Upload reference photos or videos for the subcontractor. You can add, view, or remove these files.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {trade.reference_media?.map(m => (
                                        <div key={m.id} className="w-32 rounded-lg border overflow-hidden relative group">
                                            <img src={m.file_url} className="w-full h-24 object-cover" />
                                            <div className="bg-white p-2 text-xs text-slate-500 flex justify-between items-center px-2 border-t">
                                                <span className="truncate w-full pr-1">{m.file_name}</span>
                                                <Trash2 className="text-rose-400 w-3 h-3 flex-shrink-0 cursor-pointer hover:text-rose-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={openCloudinaryWidget} disabled={uploading} className="w-full py-6 mt-4 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 flex flex-col items-center justify-center transition-colors text-slate-800">
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5 text-blue-500 mb-2" />}
                                    <div className="text-sm font-semibold">Add Reference Media</div>
                                    <div className="text-xs text-slate-500 mt-1">Click to select photos or videos</div>
                                </button>
                            </TabsContent>
                            <TabsContent value="sub" className="m-0 p-6 space-y-4 border-b border-slate-200">
                                <p className="text-sm text-slate-500">
                                    Proof-of-work media uploaded by the Subcontractor. You cannot delete these.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {trade.proof_of_work_media?.map(m => (
                                        <div key={m.id} className="w-32 rounded-lg border overflow-hidden pb-2 mb-2">
                                            <img src={m.file_url} className="w-full h-24 object-cover mb-2" />
                                            <div className="px-2 text-xs font-semibold">{m.file_name}</div>
                                            <div className="px-2 text-[10px] text-slate-500 mt-1">{new Date(m.uploaded_at).toLocaleString()}</div>
                                        </div>
                                    ))}
                                    {(!trade.proof_of_work_media || trade.proof_of_work_media.length === 0) && (
                                        <div className="text-sm text-slate-500 py-4 w-full text-center italic text-slate-400">No proof of work uploaded yet.</div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200">
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-[#0077CC] hover:bg-[#005FA3] text-white">
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
