"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { ProjectTrade, ProjectMedia } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, UploadCloud, X, HelpCircle, FileText, Image as ImageIcon } from "lucide-react"

export default function TradePortalPage() {
  const params = useParams()
  const t = useTranslations("projects.subPortal")
  const [trade, setTrade] = useState<ProjectTrade | null>(null)
  const [loading, setLoading] = useState(true)
  const tradeUuid = params.uuid as string

  const [uploading, setUploading] = useState(false)
  const [showGCMeida, setShowGCMedia] = useState(false)

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

  const openCloudinaryWidget = () => {
    if (typeof window === "undefined" || !trade) return
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      alert("Image upload not configured")
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
              const attachRes = await api.attachProjectMedia(trade.project_id, {
                trade_id: trade.id,
                file_url: result.info.secure_url,
                file_name: result.info.original_filename + "." + result.info.format,
                file_size: result.info.bytes,
                media_type: "PHOTO",
                context: "TRADE_PROOF",
              }) as ProjectMedia

              const updatedTrade = {
                ...trade,
                proof_of_work_media: [...(trade.proof_of_work_media || []), attachRes]
              }
              setTrade(updatedTrade)
            } catch (err: any) {
              console.error("Error saving proof of work", err)
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
        api.attachProjectMedia(trade.project_id, {
          trade_id: trade.id,
          file_url: url,
          file_name: "proof-of-work",
          file_size: 0,
          media_type: "PHOTO",
          context: "TRADE_PROOF",
        }).then(attachRes => {
          setTrade({
            ...trade,
            proof_of_work_media: [...(trade.proof_of_work_media || []), attachRes as ProjectMedia]
          })
        }).finally(() => setUploading(false))
      } else {
        setUploading(false)
      }
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
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-4">

        <Card className="border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Your Scope of Work</h1>
              <p className="text-xs text-slate-500">Project: {trade.trade_type}</p>
            </div>
          </div>
        </Card>

        {gcMediaCount > 0 && (
          <Card className="border-slate-200 shadow-sm p-4 space-y-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => setShowGCMedia(!showGCMeida)}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ImageIcon className="text-blue-500 w-4 h-4" /> View GC Reference Media
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] ml-2">{gcMediaCount} file{gcMediaCount > 1 ? 's' : ''}</span>
            </div>
            <div className="text-xs text-slate-500">
              {showGCMeida ? 'Hide' : 'Show'}
            </div>
          </Card>
        )}

        {showGCMeida && gcMediaCount > 0 && (
          <Card className="border-slate-200 shadow-sm p-4 text-sm text-slate-700">
            <div className="grid grid-cols-3 gap-2">
              {trade.reference_media?.map(m => (
                <img key={m.id} src={m.file_url} className="w-full h-24 object-cover rounded-md border border-slate-200" />
              ))}
            </div>
          </Card>
        )}

        <div className="pt-2 text-[10px] font-semibold text-slate-500 tracking-widest uppercase mb-1 mt-6">
          Trade Details
        </div>

        <Card className="border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Trade</div>
              <h2 className="text-sm font-bold text-slate-900">{trade.trade_type}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase font-semibold">Assigned To</div>
              <h2 className="text-sm font-bold text-slate-900">{trade.subcontractor_name}</h2>
              {trade.contact_info && <div className="text-xs text-slate-500">{trade.contact_info}</div>}
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-2 text-sm text-slate-700">
            <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Scope Of Work</p>
            <div className="whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">{trade.scope_of_work}</div>
          </div>

          {trade.materials_required?.length ? (
            <div className="space-y-1 text-sm text-slate-700 pt-2">
              <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2 mb-2"><HelpCircle className="w-4 h-4 text-slate-400" /> Materials Required</p>
              <ul className="list-disc pl-5 space-y-0.5 mt-2">
                {trade.materials_required.map((m, idx) => (
                  <li key={idx} className="text-blue-600"><span className="text-slate-700">{m}</span></li>
                ))}
              </ul>
            </div>
          ) : null}

          {trade.acceptance_criteria?.length ? (
            <div className="space-y-1 text-sm text-slate-700 pt-2">
              <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2 mb-2"><HelpCircle className="w-4 h-4 text-slate-400" /> Acceptance Criteria</p>
              <ul className="space-y-1 mt-2">
                {trade.acceptance_criteria.map((c, idx) => (
                  <li key={idx} className="flex gap-2 items-start text-slate-700">
                    <span className="text-green-500 font-bold">✓</span> {c.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

        </Card>

        {trade.status === "PENDING_ACCEPTANCE" && (
          <div className="pt-2">
            <Button onClick={handleAccept} className="w-full h-12 text-md font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white">
              Accept Scope
            </Button>
          </div>
        )}

        <Card className="border-slate-200 mt-6 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-900">Upload Proof of Work</h2>
          </div>

          <div className="p-4 sm:p-6 bg-white">
            <button
              onClick={openCloudinaryWidget}
              disabled={uploading}
              className="w-full py-10 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center transition-colors mb-6"
            >
              {uploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
              ) : (
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-6 h-6 text-blue-500" />
                </div>
              )}
              <h3 className="font-bold text-slate-800 text-lg sm:text-lg mb-1">Tap to Upload Photos or Videos</h3>
              <p className="text-slate-500 text-sm mb-4">of Completed Work</p>
              <p className="text-xs text-slate-400">JPG, PNG, MP4, MOV · Drag & drop supported</p>
            </button>

            {subMediaCount > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 text-left">Your Uploaded Proof ({subMediaCount})</h4>
                <div className="flex flex-wrap gap-3">
                  {trade.proof_of_work_media?.map(m => (
                    <div key={m.id} className="w-full sm:w-[48%] rounded-lg border border-slate-200 overflow-hidden relative">
                      <img src={m.file_url} className="w-full h-32 object-cover bg-slate-100" />
                      <div className="p-3 border-t border-slate-200 bg-white">
                        <div className="text-xs font-semibold text-slate-900 truncate">{m.file_name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{new Date(m.uploaded_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 rounded-full border border-blue-300 flex items-center justify-center text-[10px]">i</div>
              <p className="text-xs leading-relaxed">Uploaded media is visible to the GC instantly. Files are timestamped and saved as a permanent proof-of-work record.</p>
            </div>
          </div>
        </Card>

        <div className="bg-orange-50/50 p-4 border border-orange-200 rounded-lg mt-6 shadow-sm flex items-start gap-3">
          <span className="text-orange-500 pt-0.5">🔒</span>
          <p className="text-xs text-orange-800"><strong className="font-bold">Contractor note:</strong> Agreed pricing, other trade scopes, and internal project margin details are hidden from this view.</p>
        </div>

        <div className="mt-4 pb-10">
          <Button
            className="w-full h-12 text-md font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert("Portal link copied to clipboard")
            }}
          >
            Send Portal Link to {trade.subcontractor_name}
          </Button>
        </div>

      </div>
    </div>
  )
}
