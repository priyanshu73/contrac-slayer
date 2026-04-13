"use client"

import type { Project, ProjectMedia, Attachment } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { useState, useRef } from "react"
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

interface ProjectDocumentsProps {
  project: Project
}

export function ProjectDocuments({ project }: ProjectDocumentsProps) {
  const t = useTranslations("projects.documents")
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Merge legacy media and new attachments
  const allMedia = project.media || []
  const allAttachments = project.attachments || []

  // Unify document mapping
  const mediaDocs = allMedia.filter(m => m.media_type === "DOCUMENT").map(m => ({
    id: `m-${m.id}`,
    url: m.file_url,
    name: m.file_name,
    size: m.file_size,
    type: m.media_type
  }))

  const attDocs = allAttachments.filter(a => ["DOCUMENT", "PDF", "OTHER"].includes(a.file_type)).map(a => ({
    id: `a-${a.id}`,
    url: a.file_path,
    name: a.file_name,
    size: a.file_size,
    type: a.file_type
  }))

  const docs = [...mediaDocs, ...attDocs]

  // Unify photo mapping
  const mediaPhotos = allMedia.filter(m => ["PHOTO", "VIDEO"].includes(m.media_type)).map(m => ({
    id: `m-${m.id}`,
    url: m.file_url,
    name: m.file_name,
    size: m.file_size,
    type: m.media_type
  }))

  const attPhotos = allAttachments.filter(a => ["IMAGE", "VIDEO"].includes(a.file_type)).map(a => ({
    id: `a-${a.id}`,
    url: a.file_path,
    name: a.file_name,
    size: a.file_size,
    type: a.file_type
  }))

  const photos = [...mediaPhotos, ...attPhotos]

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    
    setUploading(true)
    try {
      await api.uploadProjectAttachment(project.id, files)
      toast({ title: t("uploadSuccess") || "Upload successful" })
      router.refresh() // Refresh project data to show new attachments
    } catch (err: any) {
      toast({ 
        title: t("uploadError") || "Upload failed", 
        description: err.message, 
        variant: "destructive" 
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
      setUploading(false)
    }
  }

  // Define Top Header actions
  const HeaderActions = () => (
    <div className="flex justify-end mb-4">
      <div>
        <input 
          ref={fileInputRef} 
          type="file" 
          multiple 
          className="hidden" 
          onChange={handleUpload} 
        />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {t("addAttachment") || "Add Attachment"}
        </Button>
      </div>
    </div>
  )

  if (!docs.length && !photos.length) {
    return (
      <div>
        <HeaderActions />
        <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500 text-center">
            {t("empty") || "No documents uploaded yet."}
        </Card>
      </div>
    )
  }

  return (
    <div>
      <HeaderActions />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{t("contractsTitle")}</h3>
            <Badge variant="outline" className="text-[11px]">
              {docs.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {docs.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 max-w-[70%]">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200 uppercase">{doc.name.split('.').pop() || "FILE"}</span>
                  <span className="truncate">{doc.name}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatSize(doc.size)}
                </span>
              </a>
            ))}
          </div>
        </Card>

        <Card className="border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{t("photosTitle")}</h3>
            <Badge variant="outline" className="text-[11px]">
              {photos.length}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 group"
              >
                {photo.type === "VIDEO" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm backdrop-blur-sm">
                      <span className="text-blue-500 font-bold ml-1">▶</span>
                    </div>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function formatSize(bytes?: number) {
  if (!bytes) return "—"
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
  return `${mb.toFixed(1)} MB`
}

