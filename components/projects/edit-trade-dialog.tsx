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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, Plus, Trash2, UploadCloud, X, Zap } from "lucide-react"
import { AddTaskDialog } from "./project-tasks"

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

    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [taskDialogOpen, setTaskDialogOpen] = useState(false)

    useEffect(() => {
        if (open && trade) {
            setScopeOfWork(trade.scope_of_work || "")
            setMaterials(trade.materials_required?.join("\n") || "")
            setAgreedPrice(trade.agreed_price?.toString() || "")
        } else {
            setScopeOfWork("")
            setMaterials("")
            setAgreedPrice("")
        }
    }, [open, trade])

    const handleOpenChange = (o: boolean) => {
        onOpenChange(o)
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !trade) return
        setUploading(true)
        try {
            const uploadedArray = await api.uploadProjectMedia(
                projectId,
                Array.from(e.target.files),
                "TRADE_REFERENCE",
                trade.id
            )
            const updatedTrade = {
                ...trade,
                reference_media: [...(trade.reference_media || []), ...uploadedArray]
            }
            onTradeUpdated(updatedTrade)
            toast({ title: "Media uploaded successfully" })
        } catch (err: any) {
            toast({ title: "Error uploading media", description: err.message, variant: "destructive" })
        } finally {
            setUploading(false)
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
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Scope of Work</Label>
                        <textarea
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            value={scopeOfWork}
                            rows={4}
                            onChange={e => setScopeOfWork(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Materials Required (One per line)</Label>
                        <textarea
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            value={materials}
                            rows={3}
                            onChange={e => setMaterials(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-slate-700 uppercase p-1">Agreed Price (Contractor Only)</Label>
                        <Input placeholder="e.g. $4,200.00" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-1">
                            <Label className="text-sm font-medium text-slate-700 uppercase">Assigned Tasks</Label>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setTaskDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Task
                            </Button>
                        </div>
                        {(!trade.tasks || trade.tasks.length === 0) ? (
                            <div className="text-sm text-slate-500 italic p-3 border rounded-lg bg-slate-50 border-dashed text-center">No tasks assigned yet.</div>
                        ) : (
                            <div className="space-y-2 mt-2">
                                {trade.tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 text-sm">{task.title}</span>
                                            {task.description && <span className="text-xs text-slate-500 mt-0.5">{task.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {task.priority && (
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] uppercase font-bold tracking-wider ${task.priority === 'HIGH' ? 'text-red-700 border-red-200 bg-red-50' :
                                                        task.priority === 'MEDIUM' ? 'text-orange-700 border-orange-200 bg-orange-50' :
                                                            'text-blue-700 border-blue-200 bg-blue-50'
                                                        }`}
                                                >
                                                    {task.priority}
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] uppercase font-bold tracking-wider ${task.status === 'COMPLETED' ? 'text-green-700 border-green-200 bg-green-50' :
                                                    task.status === 'IN_PROGRESS' ? 'text-blue-700 border-blue-200 bg-blue-50' :
                                                        task.status === 'BLOCKED' ? 'text-red-700 border-red-200 bg-red-50' :
                                                            'text-slate-700 border-slate-200 bg-white'
                                                    }`}
                                            >
                                                {task.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <Tabs defaultValue="gc" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 rounded-none bg-slate-100/50 p-0 border-t border-slate-200 h-14">
                            <TabsTrigger value="gc" className="rounded-none font-semibold text-slate-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-b-blue-500 h-full">
                                <UploadCloud className="w-4 h-4 mr-2" /> GC Prep Attachments <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{trade.reference_media?.length || 0}</span>
                            </TabsTrigger>
                            <TabsTrigger value="sub" className="rounded-none font-semibold text-slate-500 data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 h-full">
                                Sub Proof-of-Work <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{trade.proof_of_work_media?.length || 0}</span>
                            </TabsTrigger>
                        </TabsList>
                        <div className="bg-white">
                            <TabsContent value="gc" className="m-0 p-6 space-y-4 border-b border-slate-200">
                                <p className="text-sm text-slate-500">
                                    Upload reference photos or attachments for the subcontractor. You can add, view, or remove these files.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {trade.reference_media?.map(m => (
                                        <div key={m.id} className="w-32 rounded-lg border overflow-hidden relative group">
                                            {m.media_type === "PHOTO" ? (
                                                <img src={m.file_url} className="w-full h-24 object-cover" />
                                            ) : (
                                                <div className="w-full h-24 flex items-center justify-center bg-slate-100 p-2">
                                                    <span className="text-xs font-semibold text-slate-600 truncate uppercase mt-1">
                                                        {m.file_name.split('.').pop() || 'FILE'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="bg-white p-2 text-xs text-slate-500 flex justify-between items-center px-2 border-t">
                                                <span className="truncate w-full pr-1">{m.file_name}</span>
                                                <Trash2 className="text-rose-400 w-3 h-3 flex-shrink-0 cursor-pointer hover:text-rose-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <label className={`w-full py-6 mt-4 border-2 border-dashed border-slate-200 rounded-xl bg-white hover:bg-slate-50 flex flex-col items-center justify-center transition-colors text-slate-800 ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*,application/pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin mb-2" /> : <UploadCloud className="w-5 h-5 text-blue-500 mb-2" />}
                                    <div className="text-sm font-semibold">{uploading ? "Uploading..." : "Add Reference Attachment"}</div>
                                    <div className="text-xs text-slate-500 mt-1">Click to select photos, videos or PDFs</div>
                                </label>
                            </TabsContent>
                            <TabsContent value="sub" className="m-0 p-6 space-y-4 border-b border-slate-200">
                                <p className="text-sm text-slate-500">
                                    Proof-of-work media uploaded by the Subcontractor. You cannot delete these.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    {trade.proof_of_work_media?.map(m => (
                                        <div key={m.id} className="w-32 rounded-lg border overflow-hidden pb-2 mb-2">
                                            {m.media_type === "PHOTO" ? (
                                                <img src={m.file_url} className="w-full h-24 object-cover mb-2" />
                                            ) : (
                                                <div className="w-full h-24 flex items-center justify-center bg-slate-100 mb-2">
                                                    <span className="text-xs font-semibold text-slate-600 truncate uppercase mt-1">
                                                        {m.file_name.split('.').pop() || 'FILE'}
                                                    </span>
                                                </div>
                                            )}
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

            <AddTaskDialog
                open={taskDialogOpen}
                onOpenChange={setTaskDialogOpen}
                projectId={projectId}
                trades={[{ id: trade.id, trade_type: trade.trade_type, subcontractor_name: trade.subcontractor_name }]}
                initialAssignedTo={trade.subcontractor_name}
                onTaskCreated={(task) => {
                    onTradeUpdated({
                        ...trade,
                        tasks: [...(trade.tasks || []), task]
                    })
                }}
            />
        </Dialog>
    )
}
