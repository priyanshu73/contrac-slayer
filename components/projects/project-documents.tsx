"use client"

import type { Project } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useTranslations } from "next-intl"
import { useState, useRef } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/api"

interface ProjectDocumentsProps {
  project: Project
  onRefresh?: () => Promise<void>
}

export function ProjectDocuments({ project, onRefresh }: ProjectDocumentsProps) {
  const t = useTranslations("projects.documents")
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProjectFileItem | null>(null)

  // Merge legacy media and new attachments
  const allMedia = project.media || []
  const allAttachments = project.attachments || []

  // Unify document mapping
  const mediaDocs = allMedia.filter(m => m.media_type === "DOCUMENT").map(m => ({
    id: `m-${m.id}`,
    entityId: m.id,
    source: "media" as const,
    url: m.file_url,
    name: m.file_name,
    size: m.file_size,
    type: m.media_type
  }))

  const attDocs = allAttachments.filter(a => ["DOCUMENT", "PDF", "OTHER"].includes(a.file_type)).map(a => ({
    id: `a-${a.id}`,
    entityId: a.id,
    source: "attachment" as const,
    url: a.public_url || a.file_path,
    name: a.file_name,
    size: a.file_size,
    type: a.file_type
  }))

  const docs = [...mediaDocs, ...attDocs]

  // Unify photo mapping
  const mediaPhotos = allMedia.filter(m => ["PHOTO", "VIDEO"].includes(m.media_type)).map(m => ({
    id: `m-${m.id}`,
    entityId: m.id,
    source: "media" as const,
    url: m.file_url,
    name: m.file_name,
    size: m.file_size,
    type: m.media_type
  }))

  const attPhotos = allAttachments.filter(a => ["IMAGE", "VIDEO"].includes(a.file_type)).map(a => ({
    id: `a-${a.id}`,
    entityId: a.id,
    source: "attachment" as const,
    url: a.public_url || a.file_path,
    name: a.file_name,
    size: a.file_size,
    type: a.file_type
  }))

  const photos = [...mediaPhotos, ...attPhotos]

  const handleOpenFile = async (item: ProjectFileItem) => {
    try {
      const url = item.source === "attachment"
        ? (await api.getAttachmentAccessUrl(item.entityId)).public_url
        : item.url
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err: any) {
      toast({
        title: t("openError") || "Could not open attachment",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (item: ProjectFileItem) => {
    setDeletingId(item.id)
    setPendingDelete(null)
    try {
      if (item.source === "attachment") {
        await api.deleteProjectAttachment(project.id, item.entityId)
      } else {
        await api.deleteProjectMedia(project.id, item.entityId)
      }
      toast({ title: t("deleteSuccess") || "Attachment deleted" })
      if (onRefresh) await onRefresh()
    } catch (err: any) {
      toast({
        title: t("deleteError") || "Delete failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    
    setUploading(true)
    try {
      await api.uploadProjectAttachment(project.id, files)
      toast({ title: t("uploadSuccess") || "Upload successful" })
      if (onRefresh) await onRefresh()
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
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => void handleOpenFile(doc)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2 max-w-[70%]">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200 uppercase">{doc.name.split('.').pop() || "FILE"}</span>
                    <span className="truncate">{doc.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatSize(doc.size)}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-slate-400 hover:text-rose-600"
                  onClick={() => setPendingDelete(doc)}
                  disabled={deletingId === doc.id}
                  aria-label={t("deleteAction") || "Delete attachment"}
                >
                  {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
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
              <div
                key={photo.id}
                className="relative block aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 group"
              >
                <button
                  type="button"
                  onClick={() => void handleOpenFile(photo)}
                  className="absolute inset-0"
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
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-white hover:text-rose-600"
                  onClick={() => setPendingDelete(photo)}
                  disabled={deletingId === photo.id}
                  aria-label={t("deleteAction") || "Delete attachment"}
                >
                  {deletingId === photo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle") || "Delete attachment?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: pendingDelete?.name || "" }) || "This attachment will be permanently removed from the project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault()
                if (pendingDelete) {
                  void handleDelete(pendingDelete)
                }
              }}
            >
              {t("confirmDelete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type ProjectFileItem = {
  id: string
  entityId: number
  source: "attachment" | "media"
  url: string
  name: string
  size?: number
  type: string
}

function formatSize(bytes?: number) {
  if (!bytes) return "—"
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
  return `${mb.toFixed(1)} MB`
}
