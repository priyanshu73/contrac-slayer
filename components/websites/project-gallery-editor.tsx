"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import type { WebsiteContentV2 } from "@/lib/types/website"
import { addWebsiteProject, addWebsiteProjectImage, updateWebsiteProject, updateWebsiteProjectImage, removeWebsiteProject, removeWebsiteProjectImage, moveWebsiteProject, moveWebsiteProjectImage, pairWebsiteProjectImages, unpairWebsiteProjectImage, MAX_PROJECT_IMAGES, MAX_WEBSITE_PROJECTS } from "@/lib/website-gallery"
import { Button } from "@/components/ui/button"
import styles from "./project-gallery-editor.module.css"

type Change = (update: (content: WebsiteContentV2) => WebsiteContentV2) => void
interface Props { content: WebsiteContentV2; onChange: Change; rightsAttested: boolean; setRightsAttested: (value: boolean) => void }
interface Transfer { projectId: string; file: File; progress: number; status: "uploading" | "confirming" | "failed" | "cancelled" | "ready"; error?: string; assetId?: string }
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`

export function ProjectGalleryEditor({ content, onChange, rightsAttested, setRightsAttested }: Props) {
  const t = useTranslations("website.gallery")
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const current = useRef(content)
  current.current = content
  const permission = useRef(rightsAttested)
  permission.current = rightsAttested
  const mounted = useRef(true)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const controller = useRef<AbortController | null>(null)
  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const previewsRef = useRef<Record<string, string>>({})
  const pendingPreviews = useRef(new Set<string>())
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({})
  const [pairChoice, setPairChoice] = useState<Record<string, string>>({})
  const root = useRef<HTMLDivElement | null>(null)
  const [removal, setRemoval] = useState<{ projectId: string; imageId?: string } | null>(null)
  const [coverOpen, setCoverOpen] = useState(false)
  const assetIds = [...new Set([content.branding.hero_asset_id, ...content.projects.flatMap(p => p.images.map(i => i.asset_id))].filter((x): x is string => Boolean(x)))].join(",")

  async function loadPreview(assetId: string) {
    if (pendingPreviews.current.has(assetId) || previewsRef.current[assetId]) return
    pendingPreviews.current.add(assetId)
    try {
      const url = await api.getWebsiteAssetPreview(assetId, 480)
      if (!mounted.current) { URL.revokeObjectURL(url); return }
      previewsRef.current = { ...previewsRef.current, [assetId]: url }
      setPreviews(previewsRef.current)
      setPreviewErrors(old => ({ ...old, [assetId]: false }))
    } catch { if (mounted.current) setPreviewErrors(old => ({ ...old, [assetId]: true })) }
    finally { pendingPreviews.current.delete(assetId) }
  }
  useEffect(() => {
    assetIds.split(",").filter(Boolean).forEach(assetId => { if (!previewErrors[assetId]) void loadPreview(assetId) })
  // Preview errors wait for an explicit retry rather than looping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIds])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort(); Object.values(previewsRef.current).forEach(url => URL.revokeObjectURL(url)); previewsRef.current = {} }
  }, [])

  function focusControl(key: string) {
    requestAnimationFrame(() => { Array.from(root.current?.querySelectorAll<HTMLElement>("[data-focus]") ?? []).find(element => element.dataset.focus === key)?.focus() })
  }
  function change(update: (content: WebsiteContentV2) => WebsiteContentV2) {
    try { onChange(update); setError("") } catch (err) { setError(err instanceof Error ? err.message : t("failed")) }
  }
  async function upload(projectId: string, file: File, existingAssetId?: string) {
    if (controller.current) { setError(t("oneAtATime")); return }
    if (!permission.current) { setError(t("rightsRequired")); return }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError(t("requirements")); return }
    const project = current.current.projects.find(p => p.id === projectId)
    if (!project || project.images.length >= MAX_PROJECT_IMAGES) { setError(t("destinationGone")); return }
    const abort = new AbortController()
    controller.current = abort
    let confirmedAssetId = existingAssetId
    setError("")
    setTransfer({ projectId, file, progress: 0, status: existingAssetId ? "confirming" : "uploading", assetId: existingAssetId })
    try {
      if (!confirmedAssetId) {
        const result = await api.uploadWebsiteAsset(file, "project", { signal: abort.signal, onProgress: progress => { if (mounted.current) setTransfer(old => old ? { ...old, progress, status: progress === 100 ? "confirming" : "uploading" } : old) } })
        confirmedAssetId = result.asset_id
        if (!confirmedAssetId) throw new Error(t("failed"))
      }
      if (abort.signal.aborted) throw new DOMException("Cancelled", "AbortError")
      const url = await api.getWebsiteAssetPreview(confirmedAssetId, 480)
      if (!mounted.current || abort.signal.aborted) { URL.revokeObjectURL(url); throw new DOMException("Cancelled", "AbortError") }
      if (!permission.current || !current.current.projects.some(p => p.id === projectId && p.images.length < MAX_PROJECT_IMAGES)) { URL.revokeObjectURL(url); throw new Error(t("destinationGone")) }
      const assetId = confirmedAssetId
      const imageId = id("image")
      changeRef.current(latest => {
        const destination = latest.projects.find(project => project.id === projectId)
        if (!permission.current || !destination || destination.images.length >= MAX_PROJECT_IMAGES) throw new Error(t("destinationGone"))
        return addWebsiteProjectImage(latest, projectId, imageId, assetId)
      })
      previewsRef.current = { ...previewsRef.current, [assetId]: url }
      setPreviews(previewsRef.current)
      setTransfer({ projectId, file, progress: 100, status: "ready", assetId })
    } catch (err) {
      if (mounted.current) setTransfer({ projectId, file, progress: 0, status: abort.signal.aborted ? "cancelled" : "failed", assetId: confirmedAssetId, error: err instanceof Error ? err.message : t("failed") })
    } finally { controller.current = null }
  }
  function pick(projectId: string, files: FileList | null) {
    if (!files?.length) return
    if (files.length > 1) { setError(t("singleFile")); return }
    void upload(projectId, files[0])
  }
  function thumbnail(assetId: string, alt: string) {
    return previews[assetId] ? <Image className={styles.thumbnail} src={previews[assetId]} alt={alt} width={80} height={80} unoptimized /> : <div className={styles.placeholder}>{previewErrors[assetId] ? <Button type="button" variant="ghost" size="sm" onClick={() => void loadPreview(assetId)}>{t("retryPreview")}</Button> : t("previewLoading")}</div>
  }

  return <div className={styles.gallery} ref={root}>
    <h3>{t("title")}</h3><p className={styles.hint}>{t("intro")}</p>
    <label className={styles.rights}><input type="checkbox" checked={rightsAttested} onChange={event => setRightsAttested(event.target.checked)} /><span>{t("rights")}</span></label><p className={styles.hint}>{t("metadata")}</p>
    {error && <div role="alert" className={`${styles.status} ${styles.error}`}>{error}</div>}
    {content.branding.hero_asset_id && <div className={styles.cover}>
      <div className={styles.photo}>{thumbnail(content.branding.hero_asset_id, content.branding.hero_alt)}<div><strong>{t("cover")}</strong><p className={styles.hint}>{t("private")}</p><Button type="button" variant="outline" onClick={() => setCoverOpen(!coverOpen)}>{t("crop")}</Button></div></div>
      {coverOpen && <div><p className={styles.hint}>{t("focalHint")}</p>{(["x", "y"] as const).map(axis => <label className={styles.field} key={axis}><span>{t(axis === "x" ? "horizontal" : "vertical")}</span><input type="range" min="0" max="1" step="0.01" value={content.branding.hero_focal_point?.[axis] ?? .5} onChange={event => { const value = Number(event.target.value); change(latest => ({ ...latest, branding: { ...latest.branding, hero_focal_point: { ...(latest.branding.hero_focal_point ?? { x: .5, y: .5 }), [axis]: value } } })) }} /></label>)}<Button type="button" variant="ghost" onClick={() => change(latest => ({ ...latest, branding: { ...latest.branding, hero_focal_point: { x: .5, y: .5 } } }))}>{t("reset")}</Button></div>}
    </div>}
    <Button type="button" variant="outline" disabled={content.projects.length >= MAX_WEBSITE_PROJECTS} data-focus="add-project" onClick={() => change(latest => addWebsiteProject(latest, id("project")))}>{t("addProject")}</Button>
    {!content.projects.length && <p className={styles.hint}>{t("empty")}</p>}
    {content.projects.map((project, projectIndex) => <section className={styles.project} key={project.id} aria-label={t("projectNumber", { number: projectIndex + 1 })}>
      <div className={styles.projectHeader}><strong>{t("projectNumber", { number: projectIndex + 1 })}</strong><div className={styles.actions}>
        <Button type="button" size="sm" variant="ghost" disabled={projectIndex === 0} aria-label={`${t("projectUp")}: ${project.title || t("projectNumber", { number: projectIndex + 1 })}`} data-focus={`project-up-${project.id}`} onClick={() => { change(latest => moveWebsiteProject(latest, project.id, projectIndex - 1)); focusControl(`project-down-${project.id}`) }}>↑</Button>
        <Button type="button" size="sm" variant="ghost" disabled={projectIndex === content.projects.length - 1} aria-label={`${t("projectDown")}: ${project.title || t("projectNumber", { number: projectIndex + 1 })}`} data-focus={`project-down-${project.id}`} onClick={() => { change(latest => moveWebsiteProject(latest, project.id, projectIndex + 1)); focusControl(`project-up-${project.id}`) }}>↓</Button>
        <Button type="button" size="sm" variant="ghost" aria-label={`${t("removeProject")}: ${project.title || t("projectNumber", { number: projectIndex + 1 })}`} data-focus={`project-remove-${project.id}`} onClick={() => { setRemoval({ projectId: project.id }); focusControl(`confirm-${project.id}`) }}>{t("removeProject")}</Button>
      </div></div>
      <label className={styles.field}><span>{t("projectTitle")}</span><input required aria-invalid={!project.title.trim()} maxLength={160} value={project.title} onChange={event => { const title = event.target.value; change(latest => updateWebsiteProject(latest, project.id, { title })) }} /></label>
      {!project.title.trim() && <p className={`${styles.hint} ${styles.error}`}>{t("titleRequired")}</p>}
      <label className={styles.field}><span>{t("description")}</span><textarea rows={3} maxLength={2000} value={project.description} onChange={event => { const description = event.target.value; change(latest => updateWebsiteProject(latest, project.id, { description })) }} /></label>
      <div className={styles.fields}><label className={styles.field}><span>{t("town")}</span><input maxLength={160} value={project.town ?? ""} onChange={event => { const town = event.target.value || null; change(latest => updateWebsiteProject(latest, project.id, { town })) }} /></label><label className={styles.field}><span>{t("date")}</span><input placeholder={t("dateFormat")} maxLength={7} pattern="[0-9]{4}(-[0-9]{2})?" value={project.approximate_date ?? ""} onChange={event => { const approximate_date = event.target.value || null; change(latest => updateWebsiteProject(latest, project.id, { approximate_date })) }} /></label></div>
      <div className={`${styles.drop} ${dragging === project.id ? styles.dropActive : ""}`} onDragOver={event => { event.preventDefault(); setDragging(project.id) }} onDragLeave={() => setDragging(null)} onDrop={event => { event.preventDefault(); setDragging(null); pick(project.id, event.dataTransfer.files) }}>
        <div className={styles.uploadSymbol} aria-hidden="true">↑</div><strong>{t("drop")}</strong><p className={styles.hint}>{t("requirements")}</p>
        <Button type="button" variant="outline" disabled={!rightsAttested || !!controller.current || project.images.length >= MAX_PROJECT_IMAGES} onClick={() => inputs.current[project.id]?.click()}>{t("choose")}</Button>{!rightsAttested && <p className={styles.hint}>{t("chooseDisabledRights")}</p>}{project.images.length >= MAX_PROJECT_IMAGES && <p className={styles.hint}>{t("chooseDisabledLimit")}</p>}<input ref={element => { inputs.current[project.id] = element }} className={styles.file} tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" disabled={!rightsAttested || !!controller.current || project.images.length >= MAX_PROJECT_IMAGES} onChange={event => { pick(project.id, event.target.files); event.target.value = "" }} />
      </div>
      {transfer?.projectId === project.id && <div role="status" className={`${styles.status} ${transfer.status === "failed" || transfer.status === "cancelled" ? styles.error : ""}`}><strong>{transfer.file.name}</strong><p>{t(transfer.status)}</p>{transfer.status === "uploading" && <progress max={100} value={transfer.progress} aria-label={t("progress")} />}{transfer.error && <p>{transfer.error}</p>}
        {transfer.status === "uploading" || transfer.status === "confirming" ? <Button type="button" size="sm" variant="outline" onClick={() => controller.current?.abort()}>{t("cancel")}</Button> : (transfer.status === "failed" && <Button type="button" size="sm" variant="outline" disabled={!rightsAttested} onClick={() => void upload(project.id, transfer.file, transfer.assetId)}>{t(transfer.assetId ? "retryConfirmation" : "retry")}</Button>)}
        {transfer.status === "cancelled" && <p className={styles.hint}>{t("cancelHint")}</p>}
      </div>}
      {removal?.projectId === project.id && <div className={styles.status} role="group" aria-label={t(removal.imageId ? "removePhoto" : "removeProject")}><p>{t(removal.imageId ? "removePhotoConfirm" : "removeProjectConfirm")}</p><div className={styles.actions}><Button type="button" data-focus={`confirm-${project.id}`} onClick={() => {
        const imageId = removal.imageId
        change(latest => imageId ? removeWebsiteProjectImage(latest, project.id, imageId) : removeWebsiteProject(latest, project.id))
        setRemoval(null)
        focusControl(imageId ? `project-remove-${project.id}` : "add-project")
      }}>{t("confirmRemove")}</Button><Button type="button" variant="outline" onClick={() => { const imageId = removal.imageId; setRemoval(null); focusControl(imageId ? `photo-remove-${imageId}` : `project-remove-${project.id}`) }}>{t("cancel")}</Button></div></div>}
      {project.images.map((image, imageIndex) => <div className={styles.photo} key={image.id}>
        {thumbnail(image.asset_id, image.alt || project.title)}<div className={styles.photoDetails}>
          <small>{t(previews[image.asset_id] ? "ready" : "previewLoading")} · {t("private")}</small>
          <div className={styles.actions}><Button type="button" size="sm" variant="ghost" disabled={imageIndex === 0} aria-label={`${t("photoUp")}: ${image.alt || t("photoNumber", { number: imageIndex + 1 })} (${project.title})`} data-focus={`photo-up-${image.id}`} onClick={() => { change(latest => moveWebsiteProjectImage(latest, project.id, image.id, imageIndex - 1)); focusControl(`photo-down-${image.id}`) }}>↑</Button><Button type="button" size="sm" variant="ghost" disabled={imageIndex === project.images.length - 1} aria-label={`${t("photoDown")}: ${image.alt || t("photoNumber", { number: imageIndex + 1 })} (${project.title})`} data-focus={`photo-down-${image.id}`} onClick={() => { change(latest => moveWebsiteProjectImage(latest, project.id, image.id, imageIndex + 1)); focusControl(`photo-up-${image.id}`) }}>↓</Button><Button type="button" size="sm" variant="ghost" aria-label={`${t("removePhoto")}: ${image.alt || t("photoNumber", { number: imageIndex + 1 })} (${project.title})`} data-focus={`photo-remove-${image.id}`} onClick={() => { setRemoval({ projectId: project.id, imageId: image.id }); focusControl(`confirm-${project.id}`) }}>{t("removePhoto")}</Button></div>
          <label className={styles.field}><span>{t("alt")}</span><input maxLength={200} value={image.alt} onChange={event => { const alt = event.target.value; change(latest => updateWebsiteProjectImage(latest, project.id, image.id, { alt })) }} /></label>
          <label className={styles.field}><span>{t("caption")}</span><input maxLength={400} value={image.caption} onChange={event => { const caption = event.target.value; change(latest => updateWebsiteProjectImage(latest, project.id, image.id, { caption })) }} /></label>
          {image.pair_id ? <div className={styles.pair}><p>{t(image.pair_role === "before" ? "before" : "after")}</p><Button type="button" size="sm" variant="ghost" aria-label={`${t("unpair")}: ${image.alt || t("photoNumber", { number: imageIndex + 1 })} (${project.title})`} onClick={() => change(latest => unpairWebsiteProjectImage(latest, project.id, image.id))}>{t("unpair")}</Button></div> : <div className={styles.actions}><label className={styles.field}><span>{t("pairAsBefore")}</span><select value={pairChoice[image.id] ?? ""} onChange={event => setPairChoice(old => ({ ...old, [image.id]: event.target.value }))}><option value="">{t("chooseAfter")}</option>{project.images.filter(candidate => candidate.id !== image.id && !candidate.pair_id).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.alt || t("photoNumber", { number: project.images.indexOf(candidate) + 1 })}</option>)}</select></label><Button type="button" size="sm" variant="outline" disabled={!pairChoice[image.id]} onClick={() => change(latest => pairWebsiteProjectImages(latest, project.id, image.id, pairChoice[image.id], id("pair")))}>{t("pair")}</Button>{!pairChoice[image.id] && <p className={styles.hint}>{t("pairDisabled")}</p>}</div>}
        </div>
      </div>)}
    </section>)}
    <div className={styles.browse}><strong>{t("fromProjects")}</strong><p className={styles.hint}>{t("importLimit")}</p></div>
  </div>
}
