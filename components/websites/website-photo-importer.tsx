"use client"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import styles from "./project-gallery-editor.module.css"

type Kind = "attachment" | "project_media"
type Candidate = { source_kind: Kind; source_id: number; file_name: string; bytes: number | null; eligible: boolean; reason: string | null }
export function WebsitePhotoImporter({ destinationTitle, enabled, onAttach, onCancel }: { destinationTitle: string; enabled: boolean; onAttach: (assetId: string) => void; onCancel: () => void }) {
  const t = useTranslations("website.gallery")
  const [projects, setProjects] = useState<Array<{ id: number; title: string }>>([])
  const [projectCursor, setProjectCursor] = useState<string | undefined>()
  const [projectId, setProjectId] = useState(0)
  const [kind, setKind] = useState<Kind>("project_media")
  const [items, setItems] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [after, setAfter] = useState<number | null>(null)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [rights, setRights] = useState(false)
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [previewErrors, setPreviewErrors] = useState<Record<number, boolean>>({})
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const active = useRef(true)
  const permitted = useRef(false); permitted.current = rights && enabled
  const transfer = useRef<{ candidate: Candidate; requestId: string; assetId?: string } | null>(null)
  const urls = useRef<string[]>([])
  const generation = useRef(0)
  const [retryLoad, setRetryLoad] = useState(0)
  useEffect(() => {
    active.current = true
    return () => { active.current = false; urls.current.forEach(URL.revokeObjectURL); urls.current = [] }
  }, [])
  async function loadProjects(cursor?: string) {
    try {
      const page = await api.getProjectList({ limit: 20, cursor })
      if (!active.current) return
      setProjects(old => cursor ? [...old, ...page.items.map(p => ({ id: p.id, title: p.title }))] : page.items.map(p => ({ id: p.id, title: p.title })))
      setProjectCursor(page.next_cursor)
    } catch { if (active.current) setError(t("importLoadFailed")) }
  }
  useEffect(() => { void loadProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const abort = new AbortController(); const current = ++generation.current
    setItems([]); setSelected(null); setRights(false); setAfter(null); setPreviews({}); setPreviewErrors({}); setError("")
    urls.current.forEach(URL.revokeObjectURL); urls.current = []
    if (projectId) { setLoading(true); void (async () => {
      try {
        const page = await api.getWebsiteImportCandidates(projectId, kind)
        if (!active.current || current !== generation.current) return
        setItems(page.items); setAfter(page.next_after_id)
        await Promise.all(page.items.filter(item => item.eligible).map(async item => {
          try {
            const url = await api.getWebsiteImportPreview(item.source_kind, item.source_id, abort.signal)
            if (!active.current || current !== generation.current) { URL.revokeObjectURL(url); return }
            urls.current.push(url); setPreviews(old => ({ ...old, [item.source_id]: url }))
          } catch { if (!abort.signal.aborted && active.current && current === generation.current) setPreviewErrors(old => ({ ...old, [item.source_id]: true })) }
        }))
      } catch { if (active.current && current === generation.current) setError(t("importLoadFailed")) }
      finally { if (active.current && current === generation.current) setLoading(false) }
    })() } else setLoading(false)
    return () => abort.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, kind, retryLoad])
  async function nextPage() {
    if (!after || busy || loading) return
    const current = ++generation.current
    setBusy(true)
    try {
      const page = await api.getWebsiteImportCandidates(projectId, kind, after)
      if (!active.current || current !== generation.current) return
      urls.current.forEach(URL.revokeObjectURL); urls.current=[]; setPreviews({}); setPreviewErrors({}); setItems(page.items); setAfter(page.next_after_id); setSelected(null); setRights(false)
      await Promise.all(page.items.filter(item => item.eligible).map(async item => {
        try { const url = await api.getWebsiteImportPreview(item.source_kind, item.source_id); if (!active.current || current !== generation.current) { URL.revokeObjectURL(url); return }; urls.current.push(url); setPreviews(old => ({ ...old, [item.source_id]: url })) }
        catch { if (active.current && current === generation.current) setPreviewErrors(old => ({ ...old, [item.source_id]: true })) }
      }))
    } catch { if (active.current) setError(t("importLoadFailed")) }
    finally { if (active.current) setBusy(false) }
  }
  async function copy() {
    if (!selected || !permitted.current || inFlight.current) return
    inFlight.current = true
    if (!transfer.current || transfer.current.candidate.source_id !== selected.source_id || transfer.current.candidate.source_kind !== selected.source_kind) transfer.current = { candidate: selected, requestId: crypto.randomUUID() }
    const attempt = transfer.current
    setBusy(true); setError(""); setStatus(t("importCopying"))
    try {
      if (!attempt.assetId) {
        const asset = await api.importWebsitePhoto({ source_kind: attempt.candidate.source_kind, source_id: attempt.candidate.source_id, request_id: attempt.requestId, rights_attested: true })
        if (!asset.asset_id || asset.status !== "approved") throw new Error(t("failed"))
        attempt.assetId = asset.asset_id
      }
      if (!active.current || !permitted.current) { if (active.current) setStatus(t("importCancelled")); return }
      setStatus(t("confirming"))
      const url = await api.getWebsiteAssetPreview(attempt.assetId, 480)
      URL.revokeObjectURL(url)
      if (!active.current || !permitted.current) { if (active.current) setStatus(t("importCancelled")); return }
      onAttach(attempt.assetId)
      transfer.current = null
      setStatus(t("importAdded")); setSelected(null); setRights(false)
    } catch (err) { if (active.current) { setError(err instanceof Error ? err.message : t("failed")); setStatus("") } }
    finally { inFlight.current = false; if (active.current) setBusy(false) }
  }
  return <div className={styles.importPanel} role="group" aria-label={t("fromProjects")}>
    <h4>{t("fromProjects")}</h4><p className={styles.hint}>{t("importPrivacy", { title: destinationTitle })}</p>
    <label className={styles.field}><span>{t("sourceProject")}</span><select autoFocus disabled={busy} value={projectId} onChange={e => setProjectId(Number(e.target.value))}><option value={0}>{t("chooseSourceProject")}</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
    {projectCursor && <Button type="button" variant="outline" disabled={busy} onClick={() => void loadProjects(projectCursor)}>{t("moreProjects")}</Button>}
    <label className={styles.field}><span>{t("sourceType")}</span><select disabled={busy} value={kind} onChange={e => setKind(e.target.value as Kind)}><option value="project_media">{t("projectPhotos")}</option><option value="attachment">{t("projectAttachments")}</option></select></label>
    <div className={styles.importGrid}>{items.map(item => <label className={`${styles.importTile} ${selected?.source_id === item.source_id ? styles.importSelected : ""}`} key={item.source_id}>
      <input type="radio" name="website-import-source" disabled={busy || !item.eligible || !previews[item.source_id]} checked={selected?.source_id === item.source_id} onChange={() => { setSelected(item); setRights(false); setError(""); setStatus(""); transfer.current = null }} />
      {previews[item.source_id] ? <Image src={previews[item.source_id]} width={480} height={360} unoptimized alt="" /> : <span>{!item.eligible ? t("reupload") : previewErrors[item.source_id] ? t("sourcePreviewFailed") : t("previewLoading")}</span>}
      <span>{item.file_name}</span>
    </label>)}</div>
    {loading && <p role="status">{t("previewLoading")}</p>}
    {!!projectId && !loading && !items.length && !error && <p className={styles.hint}>{t("noSourcePhotos")}</p>}
    {after && <Button type="button" variant="outline" disabled={busy || loading} onClick={() => void nextPage()}>{t("morePhotos")}</Button>}
    <label className={styles.rights}><input type="checkbox" checked={rights} disabled={!selected} onChange={event => setRights(event.target.checked)} /><span>{t("rights")}</span></label>
    {error && <p role="alert" className={styles.error}>{error}</p>}{status && <p role="status">{status}</p>}
    <div className={styles.actions}><Button type="button" variant="outline" onClick={onCancel}>{t("cancel")}</Button><Button type="button" disabled={!selected || !rights || !enabled || busy} onClick={() => void copy()}>{error && transfer.current ? t("retryCopy") : t("copyPhoto")}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setRetryLoad(x => x + 1)}>{t("retryPreview")}</Button></div>
    {(!selected || !rights || !enabled) && <p className={styles.hint}>{t(!enabled ? "imageLimit" : !selected ? "chooseSourcePhoto" : "rightsRequired")}</p>}
    <p className={styles.hint}>{t("importSupported")}</p>
  </div>
}
