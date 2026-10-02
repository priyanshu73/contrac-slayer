"use client"

import { useEffect, useRef, useState } from "react"
import { api } from "./api"
import type { WebsiteContentV2 } from "./types/website"

export function useWebsiteDraftPreviews(content: WebsiteContentV2 | null, enabled: boolean) {
  const urls = useRef<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const idsKey = content ? [...new Set([content.branding.logo_asset_id, content.branding.hero_asset_id, ...content.projects.flatMap(project => project.images.map(image => image.asset_id))].filter((id): id is string => Boolean(id)))].join(",") : ""
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setFailed(false)
    const ids = idsKey.split(",").filter(Boolean)
    for (const [id, url] of Object.entries(urls.current)) {
      if (!ids.includes(id)) { URL.revokeObjectURL(url); delete urls.current[id] }
    }
    setPreviews({ ...urls.current })
    ids.forEach(id => {
      if (urls.current[id]) return
      void api.getWebsiteAssetPreview(id, 960).then(url => {
        if (cancelled) { URL.revokeObjectURL(url); return }
        urls.current[id] = url
        setPreviews({ ...urls.current })
      }).catch(() => { if (!cancelled) setFailed(true) })
    })
    return () => { cancelled = true }
  }, [enabled, idsKey, attempt])
  useEffect(() => () => {
    Object.values(urls.current).forEach(url => URL.revokeObjectURL(url))
    urls.current = {}
  }, [])
  return { previews, failed, retry: () => setAttempt(value => value + 1) }
}
