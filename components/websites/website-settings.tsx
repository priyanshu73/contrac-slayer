"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Copy, ExternalLink, Globe, Loader2, Monitor, Redo2, Smartphone, Undo2, Upload } from "lucide-react"
import { api } from "@/lib/api"
import { isWebsiteV2, WEBSITE_TEMPLATES, type WebsiteContentV2, type WebsiteSave, type WebsiteSectionKey, type WebsiteState, type WebsiteTemplate } from "@/lib/types/website"
import { moveSection, normalizedSections, switchTemplate } from "@/lib/website-content"
import { hasMeaningfulStepContent, normalizeWebsiteSave, validateStep, validateWebsite, websiteErrorsFromApi, type WebsiteField, type WebsiteFieldErrors, type WebsiteValidationKey } from "@/lib/website-validation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ContractorWebsite } from "./contractor-website"
import styles from "./editor.module.css"

const STEP_KEYS = ["business", "work", "availability", "proof", "brand", "review"] as const
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
type SaveStatus = "idle" | "saving" | "saved" | "invalid" | "failed" | "offline" | "conflict"

function copyContent(content: WebsiteContentV2): WebsiteContentV2 { return structuredClone(content) }
function newId(prefix: string): string { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}` }

export function WebsiteSettings() {
  const t = useTranslations("website")
  const [saved, setSaved] = useState<WebsiteState | null>(null)
  const [draft, setDraft] = useState<WebsiteSave | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<WebsiteFieldErrors>({})
  const [message, setMessage] = useState("")
  const [origin, setOrigin] = useState("")
  const [step, setStep] = useState(0)
  const [mobilePreview, setMobilePreview] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [past, setPast] = useState<WebsiteContentV2[]>([])
  const [future, setFuture] = useState<WebsiteContentV2[]>([])
  const [rightsAttested, setRightsAttested] = useState(false)
  const [testimonialPermission, setTestimonialPermission] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [assetPreviews, setAssetPreviews] = useState<Record<string, string>>({})
  const [revisions, setRevisions] = useState<Array<{ revision: number; schema_version: number; created_at: string; reason: string }>>([])

  const v2 = draft && isWebsiteV2(draft.content) ? draft.content : null
  const dirty = Boolean(saved && draft && JSON.stringify(normalizeWebsiteSave(draft)) !== JSON.stringify(normalizeWebsiteSave({ slug: saved.slug, content: saved.content })))

  const accept = useCallback((site: WebsiteState, resetDraft = true) => {
    setSaved(site)
    if (resetDraft) setDraft({ slug: site.slug, content: site.content, expected_draft_revision: site.draft_revision })
    setFieldErrors({})
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const site = await api.getWebsite()
      accept(site)
      const remembered = Number(localStorage.getItem(`website-setup-step:${site.slug}`))
      if (Number.isInteger(remembered) && remembered >= 0 && remembered < STEP_KEYS.length) setStep(remembered)
    } catch (err) { setError(err instanceof Error ? err.message : t("loadError")) }
    finally { setLoading(false) }
  }, [accept, t])

  useEffect(() => { void load(); setOrigin(window.location.origin) }, [load])
  useEffect(() => { if (saved) localStorage.setItem(`website-setup-step:${saved.slug}`, String(step)) }, [saved, step])
  useEffect(() => {
    if (step !== STEP_KEYS.length - 1 || !v2) return
    void api.getWebsiteRevisions().then(setRevisions).catch(() => setRevisions([]))
  }, [step, v2])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const persist = useCallback(async (publish = false) => {
    if (!draft || !saved || !isWebsiteV2(draft.content)) return
    const validation = validateWebsite(draft.content, draft.slug)
    if (Object.keys(validation).length) {
      setFieldErrors(validation); setSaveStatus("invalid"); setError(t("setup.fixFields"))
      throw new Error(t("setup.fixFields"))
    }
    const normalizedDraft = normalizeWebsiteSave(draft)
    const submittedSignature = JSON.stringify({ slug: normalizedDraft.slug, content: normalizedDraft.content })
    setSaveStatus("saving"); setError(""); setMessage("")
    try {
      const payload: WebsiteSave = {
        slug: normalizedDraft.slug,
        content: normalizedDraft.content,
        expected_draft_revision: saved.draft_revision,
        approved_testimonial_ids: publish && testimonialPermission ? draft.content.testimonials.map((item) => item.id) : [],
      }
      const result = publish ? await api.publishWebsite(payload) : await api.saveWebsite(payload)
      setSaved(result)
      setDraft((current) => {
        if (!current) return { slug: result.slug, content: result.content, expected_draft_revision: result.draft_revision }
        const normalizedCurrent = normalizeWebsiteSave(current)
        const currentSignature = JSON.stringify({ slug: normalizedCurrent.slug, content: normalizedCurrent.content })
        if (currentSignature === submittedSignature) {
          return { ...current, slug: result.slug, expected_draft_revision: result.draft_revision }
        }
        return { ...current, expected_draft_revision: result.draft_revision }
      })
      setFieldErrors({})
      setSaveStatus("saved")
      if (publish) setMessage(t("publishedMessage"))
    } catch (err) {
      const text = err instanceof Error ? err.message : t("saveError")
      const apiErrors = websiteErrorsFromApi(err)
      if (Object.keys(apiErrors).length) setFieldErrors(apiErrors)
      if (Object.keys(apiErrors).length) setSaveStatus("invalid")
      else if (!navigator.onLine) setSaveStatus("offline")
      else if (/stale|revision|conflict|changed in another/i.test(text)) setSaveStatus("conflict")
      else setSaveStatus("failed")
      setError(Object.keys(apiErrors).length ? t("setup.fixFields") : text)
      throw err
    }
  }, [draft, saved, t, testimonialPermission])

  useEffect(() => {
    if (!dirty || !v2 || publishing || ["saving", "failed", "offline", "conflict"].includes(saveStatus)) return
    const validation = validateWebsite(v2, draft?.slug || "")
    if (Object.keys(validation).length) {
      setFieldErrors(validation); setSaveStatus("invalid"); setError(t("setup.fixFields"))
      return
    }
    const timer = window.setTimeout(() => { void persist(false).catch(() => undefined) }, 1200)
    return () => window.clearTimeout(timer)
  }, [dirty, draft?.slug, persist, publishing, saveStatus, t, v2])

  function commit(next: WebsiteContentV2) {
    if (!v2 || !draft) return
    setPast((items) => [...items.slice(-29), copyContent(v2)])
    setFuture([])
    setDraft({ ...draft, content: next })
    setFieldErrors({}); setError(""); setSaveStatus("idle"); setMessage("")
  }

  function patch<K extends keyof WebsiteContentV2>(key: K, value: WebsiteContentV2[K]) { if (v2) commit({ ...v2, [key]: value }) }
  function patchIdentity(values: Partial<WebsiteContentV2["identity"]>) { if (v2) patch("identity", { ...v2.identity, ...values }) }
  function patchContact(values: Partial<WebsiteContentV2["public_contact"]>) { if (v2) patch("public_contact", { ...v2.public_contact, ...values }) }
  function patchBranding(values: Partial<WebsiteContentV2["branding"]>) { if (v2) patch("branding", { ...v2.branding, ...values }) }

  function undo() {
    if (!v2 || !draft || !past.length) return
    const previous = past[past.length - 1]
    setPast(past.slice(0, -1)); setFuture([copyContent(v2), ...future]); setDraft({ ...draft, content: previous }); setSaveStatus("idle"); setMessage("")
  }
  function redo() {
    if (!v2 || !draft || !future.length) return
    const next = future[0]
    setFuture(future.slice(1)); setPast([...past, copyContent(v2)]); setDraft({ ...draft, content: next }); setSaveStatus("idle"); setMessage("")
  }

  async function beginSetup() {
    if (!saved || !draft || isWebsiteV2(draft.content)) return
    setStarting(true); setError("")
    try {
      let state = saved
      if (saved.draft_revision === 0) state = await api.saveWebsite({ slug: draft.slug, content: draft.content })
      const converted = await api.convertWebsiteV2(state.draft_revision)
      accept(converted)
      setStep(0)
    } catch (err) { setError(err instanceof Error ? err.message : t("saveError")) }
    finally { setStarting(false) }
  }

  async function uploadAsset(file: File, role: "logo" | "hero" | "project") {
    if (!v2 || !rightsAttested) { setError(t("setup.rightsRequired")); return }
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 10 * 1024 * 1024) { setError(t("setup.imageRequirements")); return }
    setUploading(role); setError("")
    try {
      const result = await api.uploadWebsiteAsset(file, role)
      const preview = await api.getWebsiteAssetPreview(result.asset_id)
      setAssetPreviews((items) => ({ ...items, [result.asset_id]: preview }))
      if (role === "logo") patchBranding({ logo_asset_id: result.asset_id, logo_alt: `${v2.identity.company_name} logo` })
      if (role === "hero") patchBranding({ hero_asset_id: result.asset_id, hero_alt: t("setup.defaultPhotoAlt", { company: v2.identity.company_name }) })
      if (role === "project") {
        const project = v2.projects[0] ?? { id: newId("project"), order: 0, title: t("setup.projectDefaultTitle"), service_ids: [], description: "", town: null, approximate_date: null, images: [] }
        const image = { id: newId("image"), order: project.images.length, asset_id: result.asset_id, alt: "", caption: "", pair_id: null, pair_role: null }
        const nextProject = { ...project, images: [...project.images, image] }
        patch("projects", v2.projects.length ? [nextProject, ...v2.projects.slice(1)] : [nextProject])
      }
    } catch (err) { setError(err instanceof Error ? err.message : t("setup.uploadError")) }
    finally { setUploading(null) }
  }

  async function publish() {
    if (!v2) return
    const blocker = getPublishBlocker(v2, testimonialPermission, t)
    if (blocker) { setError(blocker.message); setStep(blocker.step); window.setTimeout(() => document.getElementById(blocker.target)?.focus(), 0); return }
    setPublishing(true)
    try { await persist(true) } catch { /* surfaced above */ }
    finally { setPublishing(false) }
  }

  async function unpublish() {
    setUnpublishing(true); setError("")
    try { const state = await api.unpublishWebsite(); accept(state); setMessage(t("unpublishedMessage")) }
    catch (err) { setError(err instanceof Error ? err.message : t("unpublishError")) }
    finally { setUnpublishing(false) }
  }

  async function restoreRevision(revision: number) {
    if (!saved || !window.confirm(t("setup.restoreConfirm"))) return
    setSaveStatus("saving"); setError("")
    try { const state = await api.restoreWebsiteRevision(revision, saved.draft_revision); accept(state); setMessage(t("setup.restored")); setSaveStatus("saved") }
    catch (err) { setError(err instanceof Error ? err.message : t("saveError")); setSaveStatus("failed") }
  }

  async function copyLink() {
    if (!saved) return
    try { await navigator.clipboard.writeText(`${origin}/sites/${saved.slug}`); setMessage(t("copiedMessage")) }
    catch { setError(t("copyError")) }
  }

  const statusText = useMemo(() => {
    if (saveStatus === "saving") return t("setup.saving")
    if (saveStatus === "invalid") return t("setup.needsAttention")
    if (saveStatus === "failed") return t("setup.saveFailed")
    if (saveStatus === "offline") return t("setup.offline")
    if (saveStatus === "conflict") return t("setup.conflict")
    if (dirty) return t("unsaved")
    return t("changesSaved")
  }, [dirty, saveStatus, t])

  if (loading) return <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500" role="status"><Loader2 className="h-5 w-5 animate-spin" /> {t("loading")}</div>
  if (!saved || !draft) return <div role="alert" className="rounded-xl border bg-white p-8"><p className="text-red-700">{error || t("loadError")}</p><Button onClick={load} variant="outline" className="mt-4">{t("retry")}</Button></div>
  if (!v2) return <SetupStart onStart={beginSetup} busy={starting} error={error} t={t} />

  const status = saved.is_published ? (dirty || saved.has_unpublished_changes ? t("liveChanges") : t("live")) : t("draft")
  const nextStep = async () => {
    if (!v2) return
    const stepErrors = validateStep(step, validateWebsite(v2, draft.slug))
    if (Object.keys(stepErrors).length) { setFieldErrors(stepErrors); setSaveStatus("invalid"); setError(t("setup.fixFields")); focusFirstError(stepErrors); return }
    if (["saving", "failed", "offline", "conflict"].includes(saveStatus)) { setError(t("setup.unsavedBlock")); return }
    if (dirty) {
      try { await persist(false) } catch { return }
    }
    setStep((value) => Math.min(STEP_KEYS.length - 1, value + 1))
  }
  const previousStep = () => setStep((value) => Math.max(0, value - 1))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500"><Globe className="h-4 w-4" /> {t("eyebrow")}</div><h1 className="text-3xl font-semibold tracking-tight">{t("name")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t("setup.intro")}</p></div>
        <div className="flex items-center gap-2"><span className="text-xs text-slate-500" role="status">{statusText}</span><span className={`rounded-full px-3 py-1.5 text-xs font-medium ${saved.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{status}</span></div>
      </div>
      {error && <div role="alert" className="flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span className="min-w-0 break-words">{error}</span>{saveStatus === "conflict" ? <Button size="sm" variant="outline" onClick={load}>{t("setup.loadLatest")}</Button> : (["failed", "offline"].includes(saveStatus) && <Button size="sm" variant="outline" onClick={() => void persist(false).catch(() => undefined)}>{t("retry")}</Button>)}</div>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <div className={styles.wizardShell}>
        <aside className={styles.progress} aria-label={t("setup.progressLabel")}>
          {STEP_KEYS.map((key, index) => <button key={key} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined} className={step === index ? styles.currentStep : ""}><span>{index + 1}</span><span>{t(`setup.steps.${key}`)}</span>{hasMeaningfulStepContent(v2, index, draft.slug) && <Check className="h-4 w-4" />}</button>)}
        </aside>
        <div className="min-w-0 space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
            <p className="text-sm font-medium">{t(`setup.steps.${STEP_KEYS[step]}`)}</p>
            <div className="flex gap-1"><Button type="button" size="sm" variant="ghost" onClick={undo} disabled={!past.length} aria-label={t("setup.undo")}><Undo2 className="h-4 w-4" /></Button><Button type="button" size="sm" variant="ghost" onClick={redo} disabled={!future.length} aria-label={t("setup.redo")}><Redo2 className="h-4 w-4" /></Button></div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            {step === 0 && <BusinessStep content={v2} slug={draft.slug} locked={!!saved.published_at} origin={origin} updateSlug={(slug) => { setDraft({ ...draft, slug }); setFieldErrors({}); setError(""); setSaveStatus("idle"); setMessage("") }} patchIdentity={patchIdentity} patchContact={patchContact} patchBranding={patchBranding} upload={uploadAsset} uploading={uploading} rightsAttested={rightsAttested} setRightsAttested={setRightsAttested} errors={fieldErrors} t={t} />}
            {step === 1 && <WorkStep content={v2} patch={patch} t={t} />}
            {step === 2 && <AvailabilityStep content={v2} patch={patch} profileTimezone={saved.profile_timezone} errors={fieldErrors} t={t} />}
            {step === 3 && <ProofStep content={v2} patch={patch} upload={uploadAsset} uploading={uploading} rightsAttested={rightsAttested} setRightsAttested={setRightsAttested} testimonialPermission={testimonialPermission} setTestimonialPermission={setTestimonialPermission} t={t} />}
            {step === 4 && <BrandStep content={v2} commit={commit} patch={patch} patchBranding={patchBranding} errors={fieldErrors} t={t} />}
            {step === 5 && <ReviewStep content={v2} saved={saved} testimonialPermission={testimonialPermission} setTestimonialPermission={setTestimonialPermission} revisions={revisions} restoreRevision={restoreRevision} t={t} />}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <Button type="button" variant="ghost" onClick={previousStep} disabled={step === 0}><ArrowLeft className="mr-2 h-4 w-4" />{t("setup.back")}</Button>
            <div className="flex flex-wrap items-center justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowPreview((value) => !value)}>{showPreview ? t("setup.hidePreview") : t("setup.showPreview")}</Button>{step < STEP_KEYS.length - 1 ? <Button type="button" onClick={() => void nextStep()}>{t("setup.next")}<ArrowRight className="ml-2 h-4 w-4" /></Button> : <PublishControl content={v2} testimonialPermission={testimonialPermission} publishing={publishing} published={saved.is_published} onPublish={publish} setStep={setStep} t={t} />}</div>
          </div>
        </div>
      </div>

      {showPreview && <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><div className="flex items-center justify-between border-b bg-white px-4 py-3"><span className="text-xs font-medium text-slate-600">{t("preview")}</span><div className="flex gap-1"><Button type="button" size="sm" variant={mobilePreview ? "ghost" : "secondary"} aria-label={t("widePreview")} onClick={() => setMobilePreview(false)}><Monitor className="h-4 w-4" /></Button><Button type="button" size="sm" variant={mobilePreview ? "secondary" : "ghost"} aria-label={t("mobilePreview")} onClick={() => setMobilePreview(true)}><Smartphone className="h-4 w-4" /></Button></div></div><div className="max-h-[820px] overflow-y-auto"><div className={mobilePreview ? "mx-auto max-w-[390px]" : "w-full"}><ContractorWebsite site={{ ...draft, contractor_uuid: saved.contractor_uuid, booking_slug: saved.booking_slug }} preview assetPreviews={assetPreviews} /></div></div></div>}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5"><div><p className="text-sm font-medium">{t("setup.publishBoundary")}</p><p className="mt-1 text-xs text-slate-500">{t("draftHelp")}</p></div><div className="flex gap-2">{saved.is_published && <><Button type="button" variant="ghost" onClick={unpublish} disabled={unpublishing}>{unpublishing ? t("unpublishing") : t("unpublish")}</Button><Button type="button" variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" />{t("copyLink")}</Button><a href={`/sites/${saved.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 text-sm underline">{t("visit")}<ExternalLink className="h-4 w-4" /></a></>}</div></div>
    </div>
  )
}

type Translator = ReturnType<typeof useTranslations<"website">>

function SetupStart({ onStart, busy, error, t }: { onStart: () => void; busy: boolean; error: string; t: Translator }) {
  return <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-7 sm:p-10"><p className="text-xs font-medium uppercase tracking-widest text-slate-500">{t("eyebrow")}</p><h1 className="mt-3 text-3xl font-semibold">{t("setup.startTitle")}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{t("setup.startDescription")}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><InfoCard number="1" text={t("setup.startOne")} /><InfoCard number="2" text={t("setup.startTwo")} /><InfoCard number="3" text={t("setup.startThree")} /></div>{error && <p className="mt-5 text-sm text-red-700" role="alert">{error}</p>}<Button onClick={onStart} disabled={busy} className="mt-7 bg-black text-white">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("setup.start")}</Button></div>
}
function InfoCard({ number, text }: { number: string; text: string }) { return <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs font-semibold text-slate-400">{number}</span><p className="mt-2 text-sm leading-5">{text}</p></div> }

const TRADES = ["general_contractor", "remodeling", "plumbing", "electrical", "hvac", "roofing", "landscaping", "painting", "flooring", "carpentry", "masonry", "concrete", "other"] as const

function BusinessStep({ content, slug, locked, origin, updateSlug, patchIdentity, patchContact, patchBranding, upload, uploading, rightsAttested, setRightsAttested, errors, t }: { content: WebsiteContentV2; slug: string; locked: boolean; origin: string; updateSlug: (value: string) => void; patchIdentity: (values: Partial<WebsiteContentV2["identity"]>) => void; patchContact: (values: Partial<WebsiteContentV2["public_contact"]>) => void; patchBranding: (values: Partial<WebsiteContentV2["branding"]>) => void; upload: (file: File, role: "logo" | "hero" | "project") => void; uploading: string | null; rightsAttested: boolean; setRightsAttested: (value: boolean) => void; errors: WebsiteFieldErrors; t: Translator }) {
  const selectedTrade = content.identity.trade_code === "unspecified" ? "" : TRADES.includes(content.identity.trade_code as typeof TRADES[number]) ? content.identity.trade_code : "other"
  return <div className="space-y-6">
    <StepIntro title={t("setup.businessTitle")} body={t("setup.businessBody")} />
    <SourceField label={t("businessName")} source={t("setup.fromProfile")} error={validationText(t, errors.company_name)}><Input id="website-company-name" aria-invalid={!!errors.company_name} value={content.identity.company_name} maxLength={255} onChange={(event) => patchIdentity({ company_name: event.target.value })} /></SourceField>
    <Field label={t("setup.trade")} error={validationText(t, errors.trade)}><Select value={selectedTrade} onValueChange={(value) => patchIdentity({ trade_code: value, custom_trade_label: value === "other" ? (content.identity.custom_trade_label || "") : null })}><SelectTrigger id="website-trade"><SelectValue placeholder={t("setup.tradePlaceholder")} /></SelectTrigger><SelectContent>{TRADES.map((trade) => <SelectItem key={trade} value={trade}>{t(`setup.trades.${trade}`)}</SelectItem>)}</SelectContent></Select>{selectedTrade === "other" && <Input id="website-custom-trade" maxLength={80} placeholder={t("setup.customTradePlaceholder")} value={content.identity.custom_trade_label || ""} onChange={(event) => patchIdentity({ trade_code: "other", custom_trade_label: event.target.value })} />}</Field>
    <Field label={t("headline")} error={validationText(t, errors.headline)}><Textarea id="website-headline" aria-invalid={!!errors.headline} value={content.identity.headline} maxLength={120} onChange={(event) => patchIdentity({ headline: event.target.value })} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><SourceField label={t("phone")} source={t("setup.fromProfile")} error={validationText(t, errors.phone)}><Input id="website-phone" aria-invalid={!!errors.phone} type="tel" value={content.public_contact.phone} maxLength={30} onChange={(event) => patchContact({ phone: event.target.value })} /></SourceField><SourceField label={t("email")} source={t("setup.fromProfile")} error={validationText(t, errors.email)}><Input id="website-email" aria-invalid={!!errors.email} type="email" value={content.public_contact.email || ""} onChange={(event) => patchContact({ email: event.target.value || null })} /></SourceField></div>
    <Field label={t("setup.addressVisibility")}><Select value={content.public_contact.address_visibility} onValueChange={(value: WebsiteContentV2["public_contact"]["address_visibility"]) => patchContact({ address_visibility: value, display_address: value === "hidden" ? null : content.public_contact.display_address })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hidden">{t("setup.addressHidden")}</SelectItem><SelectItem value="town_only">{t("setup.addressTown")}</SelectItem><SelectItem value="public_business">{t("setup.addressBusiness")}</SelectItem></SelectContent></Select></Field>
    {content.public_contact.address_visibility !== "hidden" && <Field label={t("setup.displayAddress")}><Input value={content.public_contact.display_address || ""} maxLength={300} onChange={(event) => patchContact({ display_address: event.target.value || null })} /></Field>}
    <Field label={t("address")} error={validationText(t, errors.slug)}><div className="flex min-w-0 flex-wrap items-center gap-2"><span className="max-w-full break-all text-sm text-slate-500">{origin}/sites/</span><Input id="website-slug" aria-invalid={!!errors.slug} value={slug} disabled={locked} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(event) => updateSlug(event.target.value.toLowerCase())} className="min-w-0 flex-1" /></div></Field>
    <UploadRights checked={rightsAttested} setChecked={setRightsAttested} t={t} /><UploadField label={t("setup.logoUpload")} busy={uploading === "logo"} onFile={(file) => upload(file, "logo")} t={t} />{content.branding.logo_asset_id && <button type="button" className="text-xs underline" onClick={() => patchBranding({ logo_asset_id: null })}>{t("setup.removeLogo")}</button>}
  </div>
}

function WorkStep({ content, patch, t }: { content: WebsiteContentV2; patch: <K extends keyof WebsiteContentV2>(key: K, value: WebsiteContentV2[K]) => void; t: Translator }) {
  const joinedServices = content.services.map((item) => item.name).join("\n")
  const joinedAreas = content.service_areas.map((item) => item.label).join("\n")
  const [services, setServices] = useState(joinedServices)
  const [areas, setAreas] = useState(joinedAreas)
  const semanticLines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean).join("\n")
  useEffect(() => { if (semanticLines(services) !== semanticLines(joinedServices)) setServices(joinedServices) }, [joinedServices, services])
  useEffect(() => { if (semanticLines(areas) !== semanticLines(joinedAreas)) setAreas(joinedAreas) }, [areas, joinedAreas])
  return <div className="space-y-6"><StepIntro title={t("setup.workTitle")} body={t("setup.workBody")} /><Field label={t("setup.servicesQuestion")} hint={t("setup.servicesHint")}><Textarea rows={7} value={services} onChange={(event) => { const raw = event.target.value; setServices(raw); const values = raw.split("\n").filter((value) => value.trim()).slice(0, 30); patch("services", values.map((name, order) => ({ id: content.services[order]?.id || newId("service"), order, name, description: content.services[order]?.description || "", image_asset_id: content.services[order]?.image_asset_id || null, price_label: content.services[order]?.price_label || null }))) }} /></Field><Field label={t("setup.areasQuestion")} hint={t("setup.areasHint")}><Textarea rows={6} value={areas} onChange={(event) => { const raw = event.target.value; setAreas(raw); const values = raw.split("\n").filter((value) => value.trim()).slice(0, 50); patch("service_areas", values.map((label, order) => ({ id: content.service_areas[order]?.id || newId("area"), order, label, kind: "town", country: null, region: null, geometry: null }))) }} /></Field></div>
}

function AvailabilityStep({ content, patch, profileTimezone, errors, t }: { content: WebsiteContentV2; patch: <K extends keyof WebsiteContentV2>(key: K, value: WebsiteContentV2[K]) => void; profileTimezone: string | null; errors: WebsiteFieldErrors; t: Translator }) {
  const defaultTimezone = profileTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const availability = content.availability ?? { timezone: defaultTimezone, weekly: {}, overrides: [], away: null, emergency_available: null, emergency_notice: "" }
  const update = (next: typeof availability) => patch("availability", next)
  const timezones = getIanaTimezones(defaultTimezone)
  return <div className="space-y-6"><StepIntro title={t("setup.hoursTitle")} body={t("setup.hoursBody")} /><Field label={t("setup.timezone")} hint={t("setup.hoursDisclaimer")} error={validationText(t, errors.timezone)}><Select value={availability.timezone} onValueChange={(timezone) => update({ ...availability, timezone })}><SelectTrigger id="website-timezone" aria-invalid={!!errors.timezone}><SelectValue /></SelectTrigger><SelectContent>{timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></Field><div className="space-y-2">{DAYS.map((day) => { const value = availability.weekly[day] ?? { closed: day === "sun", intervals: day === "sun" ? [] : [{ start: "08:00", end: "17:00", ends_next_day: false }] }; const interval = value.intervals[0] ?? { start: "08:00", end: "17:00", ends_next_day: false }; const dayError = errors[`hours.${day}`]; return <div key={day} className={`grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[70px_90px_1fr_1fr] ${dayError ? "border-red-300 bg-red-50/40" : ""}`}><span className="text-sm font-medium">{t(`setup.days.${day}`)}</span><label className="flex items-center gap-2 text-xs"><Checkbox checked={value.closed} onCheckedChange={(checked) => update({ ...availability, weekly: { ...availability.weekly, [day]: { closed: checked === true, intervals: checked ? [] : [interval] } } })} />{t("setup.closed")}</label><Input id={`website-hours-${day}-start`} aria-invalid={!!dayError} type="time" disabled={value.closed} value={interval.start} onChange={(event) => update({ ...availability, weekly: { ...availability.weekly, [day]: { closed: false, intervals: [{ ...interval, start: event.target.value }] } } })} /><Input type="time" aria-invalid={!!dayError} disabled={value.closed} value={interval.end} onChange={(event) => update({ ...availability, weekly: { ...availability.weekly, [day]: { closed: false, intervals: [{ ...interval, end: event.target.value }] } } })} />{dayError && <p className="text-xs text-red-700 sm:col-start-3 sm:col-span-2">{validationText(t, dayError)}</p>}</div> })}</div><label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm"><Checkbox checked={availability.emergency_available === true} onCheckedChange={(checked) => update({ ...availability, emergency_available: checked === true })} /><span>{t("setup.emergencyQuestion")}<small className="mt-1 block text-slate-500">{t("setup.emergencyHint")}</small></span></label></div>
}

function ProofStep({ content, patch, upload, uploading, rightsAttested, setRightsAttested, testimonialPermission, setTestimonialPermission, t }: { content: WebsiteContentV2; patch: <K extends keyof WebsiteContentV2>(key: K, value: WebsiteContentV2[K]) => void; upload: (file: File, role: "logo" | "hero" | "project") => void; uploading: string | null; rightsAttested: boolean; setRightsAttested: (value: boolean) => void; testimonialPermission: boolean; setTestimonialPermission: (value: boolean) => void; t: Translator }) {
  const project = content.projects[0]
  const credential = content.credentials[0]
  const testimonial = content.testimonials[0]
  const focal = content.branding.hero_focal_point ?? { x: .5, y: .5 }
  return <div className="space-y-6"><StepIntro title={t("setup.proofTitle")} body={t("setup.proofBody")} /><Field label={t("about")}><Textarea rows={5} maxLength={2500} value={content.identity.about} onChange={(event) => patch("identity", { ...content.identity, about: event.target.value })} /></Field><UploadRights checked={rightsAttested} setChecked={setRightsAttested} t={t} /><div className="grid gap-4 sm:grid-cols-2"><UploadField label={t("setup.heroUpload")} busy={uploading === "hero"} onFile={(file) => upload(file, "hero")} t={t} /><UploadField label={t("setup.projectUpload")} busy={uploading === "project"} onFile={(file) => upload(file, "project")} t={t} /></div>{content.branding.hero_asset_id && <div className="rounded-lg border p-4"><p className="mb-3 text-xs font-medium text-slate-600">{t("setup.focalPoint")}</p><div className="grid gap-4 sm:grid-cols-2"><Field label={t("setup.focalHorizontal")}><input className="w-full" type="range" min="0" max="1" step="0.01" value={focal.x} onChange={(event) => patch("branding", { ...content.branding, hero_focal_point: { ...focal, x: Number(event.target.value) } })} /></Field><Field label={t("setup.focalVertical")}><input className="w-full" type="range" min="0" max="1" step="0.01" value={focal.y} onChange={(event) => patch("branding", { ...content.branding, hero_focal_point: { ...focal, y: Number(event.target.value) } })} /></Field></div><Button type="button" size="sm" variant="ghost" onClick={() => patch("branding", { ...content.branding, hero_focal_point: { x: .5, y: .5 } })}>{t("setup.resetCrop")}</Button></div>}{project && <><Field label={t("setup.projectTitle")}><Input maxLength={160} value={project.title} onChange={(event) => patch("projects", [{ ...project, title: event.target.value }, ...content.projects.slice(1)])} /></Field><Field label={t("setup.projectDescription")}><Textarea maxLength={2000} value={project.description} onChange={(event) => patch("projects", [{ ...project, description: event.target.value }, ...content.projects.slice(1)])} /></Field></>}<div className="grid gap-5 sm:grid-cols-2"><Field label={t("setup.credentialOptional")} hint={t("setup.credentialHint")}><Input value={credential?.title || ""} maxLength={160} onChange={(event) => patch("credentials", event.target.value ? [{ id: credential?.id || newId("credential"), order: 0, kind: credential?.kind || "other", title: event.target.value, issuer: credential?.issuer || "", jurisdiction: credential?.jurisdiction || "", public_number: null, expiry_date: null, display_policy: "title_only" }] : [])} /></Field><Field label={t("setup.testimonialOptional")} hint={t("setup.testimonialHint")}><Textarea value={testimonial?.text || ""} maxLength={1500} onChange={(event) => patch("testimonials", event.target.value ? [{ id: testimonial?.id || newId("testimonial"), order: 0, text: event.target.value, display_name: testimonial?.display_name || t("setup.customerNamePlaceholder"), date: null, rating: null, source_label: null, source_permalink: null }] : [])} /></Field></div>{content.testimonials.length > 0 && <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox id="website-testimonial-permission-proof" checked={testimonialPermission} onCheckedChange={(checked) => setTestimonialPermission(checked === true)} /><span>{t("setup.testimonialPermission")}</span></label>}</div>
}

function BrandStep({ content, commit, patch, patchBranding, errors, t }: { content: WebsiteContentV2; commit: (content: WebsiteContentV2) => void; patch: <K extends keyof WebsiteContentV2>(key: K, value: WebsiteContentV2[K]) => void; patchBranding: (values: Partial<WebsiteContentV2["branding"]>) => void; errors: WebsiteFieldErrors; t: Translator }) {
  const faq = content.faqs[0]
  const sections = normalizedSections(content.sections)
  return <div className="space-y-7"><StepIntro title={t("setup.brandTitle")} body={t("setup.brandBody")} /><div><h3 className="mb-3 text-sm font-semibold">{t("chooseLook")}</h3><div className={styles.templateGrid}>{WEBSITE_TEMPLATES.map((template) => <button type="button" key={template.id} aria-pressed={content.branding.template_id === template.id} onClick={() => commit(switchTemplate(content, template.id))} className={content.branding.template_id === template.id ? styles.selectedTemplate : ""}><div className={styles.templateMini} data-family={template.family}><span /><i /><b /></div><strong>{t(`templates.${template.id}.name`)}</strong><small>{t(`templates.${template.id}.description`)}</small></button>)}</div></div><div className="grid gap-4 sm:grid-cols-3"><Field label={t("setup.palette")}><Select value={content.branding.theme.palette} onValueChange={(value: WebsiteContentV2["branding"]["theme"]["palette"]) => patchBranding({ theme: { ...content.branding.theme, palette: value } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["slate", "forest", "ocean", "earth", "sunset"].map((value) => <SelectItem key={value} value={value}>{t(`setup.palettes.${value}`)}</SelectItem>)}</SelectContent></Select></Field><Field label={t("setup.fonts")}><Select value={content.branding.theme.font_pair_id} onValueChange={(value: WebsiteContentV2["branding"]["theme"]["font_pair_id"]) => patchBranding({ theme: { ...content.branding.theme, font_pair_id: value } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">{t("setup.fontSystem")}</SelectItem><SelectItem value="inter">{t("setup.fontInter")}</SelectItem><SelectItem value="lora-inter">{t("setup.fontEditorial")}</SelectItem></SelectContent></Select></Field><Field label={t("setup.buttonStyle")}><Select value={content.branding.theme.button_style} onValueChange={(value: WebsiteContentV2["branding"]["theme"]["button_style"]) => patchBranding({ theme: { ...content.branding.theme, button_style: value } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="square">{t("setup.square")}</SelectItem><SelectItem value="rounded">{t("setup.rounded")}</SelectItem><SelectItem value="pill">{t("setup.pill")}</SelectItem></SelectContent></Select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label={t("setup.faqQuestion")}><Input maxLength={200} value={faq?.question || ""} onChange={(event) => patch("faqs", event.target.value ? [{ id: faq?.id || newId("faq"), order: 0, question: event.target.value, answer: faq?.answer || "" }] : [])} /></Field><Field label={t("setup.faqAnswer")} error={validationText(t, errors.faq_answer)}><Textarea id="website-faq-answer" aria-invalid={!!errors.faq_answer} maxLength={2000} value={faq?.answer || ""} onChange={(event) => faq && patch("faqs", [{ ...faq, answer: event.target.value }])} /></Field></div><div><h3 className="mb-3 text-sm font-semibold">{t("setup.sectionOrder")}</h3><div className="space-y-2">{sections.map((section, index) => <div key={section.key} className="flex items-center gap-3 rounded-lg border p-3"><Checkbox checked={section.enabled} disabled={section.key === "hero" || section.key === "contact"} onCheckedChange={(checked) => patch("sections", sections.map((item) => item.key === section.key ? { ...item, enabled: checked === true } : item))} /><span className="flex-1 text-sm">{t(`setup.sections.${section.key}`)}</span><Button type="button" size="sm" variant="ghost" disabled={index === 0} aria-label={t("setup.moveUp")} onClick={() => commit(moveSection(content, section.key as WebsiteSectionKey, -1))}><ArrowUp className="h-4 w-4" /></Button><Button type="button" size="sm" variant="ghost" disabled={index === sections.length - 1} aria-label={t("setup.moveDown")} onClick={() => commit(moveSection(content, section.key as WebsiteSectionKey, 1))}><ArrowDown className="h-4 w-4" /></Button></div>)}</div></div></div>
}

function ReviewStep({ content, saved, testimonialPermission, setTestimonialPermission, revisions, restoreRevision, t }: { content: WebsiteContentV2; saved: WebsiteState; testimonialPermission: boolean; setTestimonialPermission: (value: boolean) => void; revisions: Array<{ revision: number; schema_version: number; created_at: string; reason: string }>; restoreRevision: (revision: number) => void; t: Translator }) {
  const checks = [{ ok: !!content.identity.company_name && !!content.identity.headline, text: t("setup.reviewIdentity") }, { ok: !!content.public_contact.phone || !!content.public_contact.email, text: t("setup.reviewContact") }, { ok: !!content.branding.template_id, text: t("setup.reviewTemplate") }, { ok: !!content.availability, text: t("setup.reviewHours") }, { ok: content.public_contact.address_visibility === "hidden" || !!content.public_contact.display_address, text: t("setup.reviewAddress") }]
  return <div className="space-y-6"><StepIntro title={t("setup.reviewTitle")} body={t("setup.reviewBody")} /><div className="space-y-2">{checks.map((item) => <div key={item.text} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><span className={`grid h-6 w-6 place-items-center rounded-full ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{item.ok ? <Check className="h-4 w-4" /> : "!"}</span>{item.text}</div>)}</div>{content.testimonials.length > 0 && <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><Checkbox id="website-testimonial-permission" checked={testimonialPermission} onCheckedChange={(checked) => setTestimonialPermission(checked === true)} /><span>{t("setup.testimonialPermission")}</span></label>}<div className="rounded-lg bg-slate-50 p-4 text-sm"><p className="font-medium">{t("setup.publicDestination")}</p><p className="mt-1 text-slate-600">{content.public_contact.phone || content.public_contact.email}</p><p className="mt-3 text-xs text-slate-500">{saved.is_published ? t("setup.publishUpdates") : t("setup.publishFirstTime")}</p></div>{revisions.length > 0 && <div><h3 className="mb-3 text-sm font-semibold">{t("setup.revisions")}</h3><div className="space-y-2">{revisions.slice(0, 5).map((revision) => <div key={revision.revision} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-xs"><span>{t("setup.revisionLabel", { revision: revision.revision, reason: revision.reason })}</span>{revision.revision !== saved.draft_revision && <Button type="button" size="sm" variant="ghost" onClick={() => restoreRevision(revision.revision)}>{t("setup.restore")}</Button>}</div>)}</div></div>}</div>
}

function UploadRights({ checked, setChecked, t }: { checked: boolean; setChecked: (value: boolean) => void; t: Translator }) { return <label className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-950"><Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} /><span>{t("setup.imageRights")}<small className="mt-1 block text-amber-800">{t("setup.imagePrivacy")}</small></span></label> }
function UploadField({ label, busy, onFile, t }: { label: string; busy: boolean; onFile: (file: File) => void; t: Translator }) { const id = `upload-${label.replace(/\W+/g, "-")}`; return <div><Label htmlFor={id} className="mb-2 block text-xs font-medium text-slate-600">{label}</Label><label htmlFor={id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file && !busy) onFile(file) }} className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm hover:bg-slate-50">{busy ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : <Upload className="mb-2 h-5 w-5" />}<span>{busy ? t("setup.uploading") : t("setup.chooseFile")}</span><small className="mt-1 text-slate-500">{t("setup.imageRequirements")}</small></label><input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = "" }} /></div> }
function StepIntro({ title, body }: { title: string; body: string }) { return <div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{body}</p></div> }
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-medium text-slate-600">{label}</Label>{children}{error ? <p className="text-xs font-medium text-red-700">{error}</p> : hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}</div> }
function SourceField({ label, source, error, children }: { label: string; source: string; error?: string; children: React.ReactNode }) { return <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label className="text-xs font-medium text-slate-600">{label}</Label><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">{source}</span></div>{children}{error && <p className="text-xs font-medium text-red-700">{error}</p>}</div> }

function validationText(t: Translator, key?: WebsiteValidationKey): string | undefined { return key ? t(`setup.validation.${key}`) : undefined }

function getIanaTimezones(preferred: string): string[] {
  const fallback = ["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Phoenix", "America/Anchorage", "Pacific/Honolulu"]
  const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf
  const values = supportedValuesOf ? supportedValuesOf("timeZone") : fallback
  return Array.from(new Set([preferred, ...values])).sort()
}

function focusFirstError(errors: WebsiteFieldErrors) {
  const field = Object.keys(errors)[0] as WebsiteField | undefined
  const ids: Partial<Record<WebsiteField, string>> = { slug: "website-slug", company_name: "website-company-name", trade: "website-trade", headline: "website-headline", phone: "website-phone", email: "website-email", timezone: "website-timezone", faq_answer: "website-faq-answer" }
  const id = field?.startsWith("hours.") ? `website-hours-${field.slice(6)}-start` : field ? ids[field] : undefined
  if (id) window.setTimeout(() => document.getElementById(id)?.focus(), 0)
}

interface PublishBlocker { message: string; action: string; step: number; target: string }

function getPublishBlocker(content: WebsiteContentV2, testimonialPermission: boolean, t: Translator): PublishBlocker | null {
  if (!content.identity.company_name.trim()) return { message: t("setup.validation.requiredBusinessName"), action: t("setup.fixBusinessName"), step: 0, target: "website-company-name" }
  if (!content.identity.headline.trim()) return { message: t("setup.validation.requiredHeadline"), action: t("setup.fixHeadline"), step: 0, target: "website-headline" }
  if (!content.public_contact.phone.trim() && !content.public_contact.email?.trim()) return { message: t("setup.publishMissing"), action: t("setup.fixContact"), step: 0, target: "website-phone" }
  if (content.testimonials.length && !testimonialPermission) return { message: t("setup.testimonialPermissionRequired"), action: t("setup.confirmPermission"), step: 5, target: "website-testimonial-permission" }
  return null
}

function PublishControl({ content, testimonialPermission, publishing, published, onPublish, setStep, t }: { content: WebsiteContentV2; testimonialPermission: boolean; publishing: boolean; published: boolean; onPublish: () => void; setStep: (step: number) => void; t: Translator }) {
  const blocker = getPublishBlocker(content, testimonialPermission, t)
  return <div className="flex max-w-md flex-wrap items-center justify-end gap-2">{blocker && <p className="text-right text-xs text-amber-800">{blocker.message} <button type="button" className="font-semibold underline" onClick={() => { setStep(blocker.step); window.setTimeout(() => document.getElementById(blocker.target)?.focus(), 0) }}>{blocker.action}</button></p>}<Button type="button" className="bg-black text-white hover:bg-black/80" onClick={onPublish} disabled={publishing}>{publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}{published ? t("publishChanges") : t("publish")}</Button></div>
}
