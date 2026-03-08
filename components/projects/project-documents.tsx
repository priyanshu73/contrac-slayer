"use client"

import type { Project, ProjectMedia } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

interface ProjectDocumentsProps {
  project: Project
}

export function ProjectDocuments({ project }: ProjectDocumentsProps) {
  const t = useTranslations("projects.documents")

  const docs = (project.media || []).filter((m) => m.context === "PROJECT_DOCUMENT")
  const photos = (project.media || []).filter((m) => m.context === "PROJECT_PHOTO")

  if (!docs.length && !photos.length) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        {t("empty")}
      </Card>
    )
  }

  return (
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
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span className="truncate">{doc.file_name}</span>
              <span className="text-xs text-slate-400">
                {formatSize(doc.file_size)}
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
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.file_url}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.file_url}
                alt={photo.file_name}
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}

function formatSize(bytes?: number) {
  if (!bytes) return "—"
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
  return `${mb.toFixed(1)} MB`
}

