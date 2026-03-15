"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { ProjectTrade, ProjectTask, ProjectMedia } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, UploadCloud, X, HelpCircle, FileText, Image as ImageIcon, Calendar, ChevronDown, ChevronUp, Trash2 } from "lucide-react"

type StagedFile = { file: File; id: string; preview?: string }

export default function TradePortalPage() {
  const params = useParams()
  const t = useTranslations("projects.subPortal")
  const [trade, setTrade] = useState<ProjectTrade | null>(null)
  const [loading, setLoading] = useState(true)
  const tradeUuid = params.uuid as string

  const [uploading, setUploading] = useState(false)
  const [showGCMedia, setShowGCMedia] = useState(false)
  const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([])
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)

  const TASK_STATUSES: { value: ProjectTask["status"]; label: string }[] = [
    { value: "NOT_STARTED", label: "Not started" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "BLOCKED", label: "Blocked" },
  ]

  const handleTaskStatusChange = async (taskId: number, newStatus: ProjectTask["status"]) => {
    if (!tradeUuid || !trade) return
    setUpdatingTaskId(taskId)
    try {
      const updated = await api.updateTradeTaskStatusPublic(tradeUuid, taskId, newStatus) as ProjectTask
      setTrade({
        ...trade,
        tasks: (trade.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      })
    } catch (err) {
      console.error("Failed to update task status", err)
      alert("Failed to update task status")
    } finally {
      setUpdatingTaskId(null)
    }
  }

  useEffect(() => {
    if (!tradeUuid) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getTradeScopePublic(tradeUuid)
        if (!cancelled) setTrade(data as ProjectTrade)
      } catch (err) {
        console.error("Failed to load trade scope", err)
        if (!cancelled) setTrade(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [tradeUuid])

  const handleAccept = async () => {
    if (!tradeUuid) return
    try {
      const updated = await api.acceptTradeScopePublic(tradeUuid)
      setTrade(updated as ProjectTrade)
    } catch (err) {
      console.error("Failed to accept trade scope", err)
    }
  }

  const addFilesToStaging = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !trade) return
    const newStaged: StagedFile[] = Array.from(e.target.files).map((file) => {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      return { file, id, preview }
    })
    setStagedFiles((prev) => [...prev, ...newStaged])
    e.target.value = ""
  }

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((s) => s.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((s) => s.id !== id)
    })
  }

  const uploadStagedFiles = async () => {
    if (!stagedFiles.length || !trade || !tradeUuid) return
    setUploading(true)
    try {
      const files = stagedFiles.map((s) => s.file)
      const uploadedArray = await api.uploadTradeMediaPublic(tradeUuid, files, "TRADE_PROOF")
      setStagedFiles((prev) => {
        prev.forEach((s) => s.preview && URL.revokeObjectURL(s.preview))
        return []
      })
      setTrade({
        ...trade,
        proof_of_work_media: [...(trade.proof_of_work_media || []), ...uploadedArray],
      })
      fileInputRef.current?.value && (fileInputRef.current.value = "")
    } catch (err: any) {
      console.error("Error saving proof of work", err)
      alert("Failed to upload proof of work")
    } finally {
      setUploading(false)
    }
  }

  if (loading || !trade) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const gcMediaCount = trade.reference_media?.length || 0
  const subMediaCount = trade.proof_of_work_media?.length || 0

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-sm p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Your Scope of Work</h1>
                  <p className="text-sm text-slate-500 mt-1">Project: {trade.trade_type}</p>
                </div>
              </div>
            </Card>

            <div className="pt-2 text-xs font-semibold text-slate-500 tracking-widest uppercase mb-1">
              Trade Details
            </div>

            <Card className="border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Trade</div>
                  <h2 className="text-base font-bold text-slate-900">{trade.trade_type}</h2>
                </div>
                <div className="sm:text-right border-t sm:border-none pt-4 sm:pt-0 border-slate-100">
                  <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Assigned To</div>
                  <h2 className="text-base font-bold text-slate-900">{trade.subcontractor_name}</h2>
                  {trade.contact_info && <div className="text-sm text-slate-500">{trade.contact_info}</div>}
                </div>
              </div>

              {trade.agreed_price != null && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Agreed Price</div>
                  <h2 className="text-lg font-bold text-emerald-600">
                    ${Number(trade.agreed_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="space-y-3 text-sm text-slate-700">
                <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Scope Of Work</p>
                <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100 text-base leading-relaxed">{trade.scope_of_work}</div>
              </div>

              {trade.materials_required?.length ? (
                <div className="space-y-2 text-sm text-slate-700 pt-2">
                  <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2 mb-3"><HelpCircle className="w-4 h-4 text-slate-400" /> Materials Required</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {trade.materials_required.map((m, idx) => (
                      <li key={idx} className="text-blue-600 text-base"><span className="text-slate-700">{m}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {trade.acceptance_criteria?.length ? (
                <div className="space-y-2 text-sm text-slate-700 pt-2">
                  <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2 mb-3"><HelpCircle className="w-4 h-4 text-slate-400" /> Acceptance Criteria</p>
                  <ul className="space-y-2 mt-2">
                    {trade.acceptance_criteria.map((c, idx) => (
                      <li key={idx} className="flex gap-3 items-start text-slate-700 bg-green-50/50 p-3 rounded-lg border border-green-100/50">
                        <span className="text-green-500 font-bold mt-0.5">✓</span>
                        <span className="text-base">{c.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {trade.tasks && trade.tasks.length > 0 && (
                <div className="space-y-3 text-sm text-slate-700 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2 mb-3">Assigned Tasks</p>
                  <div className="space-y-2 mt-2">
                    {trade.tasks.map((task) => {
                      const isExpanded = expandedTaskIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => setExpandedTaskIds(prev => isExpanded ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                          className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative overflow-hidden flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>

                          <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-2 pl-2">
                            <div className="flex-1 w-full flex items-center justify-between">
                              <h4 className={`font-semibold text-sm ${task.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                            </div>
                            <div className="sm:self-stretch flex items-center justify-between w-full sm:w-auto mt-1 sm:mt-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${task.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : task.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </div>
                          </div>

                          {!isExpanded && task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 pl-2">{task.description}</p>
                          )}

                          {isExpanded && (
                            <div className="pl-2 pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap items-center gap-3 gap-y-2">
                                <span className="text-xs font-medium text-slate-500">Status</span>
                                <select
                                  value={task.status}
                                  onChange={(e) => handleTaskStatusChange(task.id, e.target.value as ProjectTask["status"])}
                                  disabled={updatingTaskId === task.id}
                                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                                >
                                  {TASK_STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
                                </select>
                                {updatingTaskId === task.id && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                              </div>
                              {task.description && <p className="text-[13px] text-slate-600 leading-relaxed">{task.description}</p>}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                                {task.scheduled_start_date && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {task.scheduled_start_date} {task.scheduled_end_date && <span className="text-slate-400 mx-1">→</span>} {task.scheduled_end_date}
                                  </div>
                                )}
                                {task.category && (
                                  <div className="text-[10px] text-slate-600 font-medium uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    {task.category}
                                  </div>
                                )}
                                {task.priority && (
                                  <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border 
                                      ${task.priority === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                      task.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                                  >
                                    {task.priority} Priority
                                  </div>
                                )}
                              </div>
                              {((task.photos?.length ?? 0) + (task.documents?.length ?? 0)) > 0 && (
                                <div className="border-t border-slate-100 pt-3 mt-3">
                                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <ImageIcon className="w-3.5 h-3.5" /> Task attachments
                                  </h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {task.photos?.map(m => (
                                      <div key={m.id} className="aspect-square relative rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                                        <img src={m.file_url} alt={m.file_name} className="absolute inset-0 w-full h-full object-cover" />
                                      </div>
                                    ))}
                                    {task.documents?.map(m => (
                                      <div key={m.id} className="aspect-square flex flex-col items-center justify-center bg-slate-100 rounded-md border border-slate-200 p-2 text-center">
                                        <FileText className="w-4 h-4 text-slate-600 mb-1" />
                                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-semibold text-slate-600 truncate w-full hover:underline" onClick={e => e.stopPropagation()}>
                                          {m.file_name}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>

            {trade.status === "PENDING_ACCEPTANCE" && (
              <div className="pt-2">
                <Button onClick={handleAccept} className="w-full h-14 text-lg font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white shadow-md hover:shadow-lg transition-all rounded-xl">
                  Accept Scope
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Media and Uploads */}
          <div className="space-y-6">
            {gcMediaCount > 0 && (
              <div className="space-y-3">
                <Card className="border-slate-200 shadow-sm p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowGCMedia(!showGCMedia)}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ImageIcon className="text-blue-500 w-5 h-5" /> GC Reference Attachments
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] ml-2 font-bold">{gcMediaCount} file{gcMediaCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                    {showGCMedia ? 'Hide' : 'Show'}
                  </div>
                </Card>

                {showGCMedia && (
                  <Card className="border-slate-200 shadow-sm p-4 text-sm text-slate-700 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      {trade.reference_media?.map(m => m.media_type === "PHOTO" ? (
                        <div key={m.id} className="aspect-square relative rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                          <img src={m.file_url} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div key={m.id} className="aspect-square flex flex-col items-center justify-center bg-slate-100 rounded-md border border-slate-200 p-2 text-center">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                            <FileText className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-600 truncate uppercase w-full">{m.file_name.split('.').pop() || 'FILE'}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center gap-3">
                <UploadCloud className="w-6 h-6 text-blue-500" />
                <h2 className="font-bold text-slate-900 text-lg">Proof of Work</h2>
              </div>

              <div className="p-5 sm:p-6 bg-white space-y-6">
                <label className={`w-full py-12 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center transition-all ${uploading ? 'opacity-50 cursor-not-allowed scale-[0.98]' : 'cursor-pointer hover:border-blue-400'}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                    onChange={addFilesToStaging}
                    disabled={uploading}
                  />
                  <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-5 border border-blue-100">
                    <UploadCloud className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg sm:text-xl mb-1">Add files to upload</h3>
                  <p className="text-slate-500 text-sm mb-4">Photos, videos & PDFs — they’ll appear below until you click Upload</p>
                  <p className="text-xs font-medium text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">Drag & drop supported</p>
                </label>

                {stagedFiles.length > 0 && (
                  <div className="border border-amber-200 rounded-xl bg-amber-50/80 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                      Ready to upload — {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {stagedFiles.map(({ file, id, preview }) => (
                        <div key={id} className="rounded-lg border border-amber-200 bg-white overflow-hidden relative group">
                          {preview ? (
                            <img src={preview} alt={file.name} className="w-full aspect-square object-cover bg-slate-100" />
                          ) : (
                            <div className="w-full aspect-square flex flex-col items-center justify-center bg-slate-50 p-2">
                              <FileText className="w-8 h-8 text-slate-400 mb-1" />
                              <span className="text-[10px] font-semibold text-slate-600 truncate w-full text-center px-1">{file.name.split(".").pop() || "FILE"}</span>
                            </div>
                          )}
                          <div className="p-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            <span className="text-[10px] font-medium text-slate-700 truncate flex-1" title={file.name}>{file.name}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); removeStagedFile(id) }}
                              className="shrink-0 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        onClick={uploadStagedFiles}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                        {uploading ? "Uploading…" : "Upload proof of work"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStagedFiles((prev) => {
                            prev.forEach((s) => s.preview && URL.revokeObjectURL(s.preview))
                            return []
                          })
                          fileInputRef.current?.value && (fileInputRef.current.value = "")
                        }}
                        disabled={uploading}
                        className="text-slate-600"
                      >
                        Clear all
                      </Button>
                    </div>
                  </div>
                )}

                {subMediaCount > 0 && (
                  <div className="border-t border-slate-100 pt-6 mt-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                      Your Uploads
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[10px]">{subMediaCount} Files</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {trade.proof_of_work_media?.map(m => (
                        <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden relative group hover:shadow-md transition-shadow">
                          {m.media_type === "PHOTO" ? (
                            <img src={m.file_url} className="w-full aspect-square object-cover bg-slate-100" />
                          ) : (
                            <div className="w-full aspect-square flex flex-col items-center justify-center bg-slate-50 p-2">
                              <FileText className="w-8 h-8 text-slate-400 mb-2" />
                              <span className="text-xs font-semibold text-slate-600 truncate uppercase mt-1 px-2 w-full text-center">
                                {m.file_name.split('.').pop() || 'FILE'}
                              </span>
                            </div>
                          )}
                          <div className="p-3 border-t border-slate-200 bg-white group-hover:bg-slate-50 transition-colors">
                            <div className="text-[11px] font-semibold text-slate-900 truncate" title={m.file_name}>{m.file_name}</div>
                            <div className="text-[9px] text-slate-500 mt-1 font-medium">{new Date(m.uploaded_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/80 text-blue-800 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-4">
                  <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold shadow-sm">i</div>
                  <p className="text-xs leading-relaxed font-medium">Uploaded attachments are instantly shared. Files are timestamped to serve as a permanent proof-of-work history.</p>
                </div>
              </div>
            </Card>

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full h-12 text-sm font-semibold text-slate-600 border-slate-300 hover:bg-slate-50 shadow-sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert("Portal link copied to clipboard")
                }}
              >
                Copy Portal Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
