"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Copy, ExternalLink, Globe, Loader2, Monitor, Smartphone } from "lucide-react"
import { api } from "@/lib/api"
import { WEBSITE_TEMPLATES, type WebsiteContent, type WebsiteSave, type WebsiteState } from "@/lib/types/website"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ContractorWebsite } from "./contractor-website"
import styles from "./editor.module.css"

export function WebsiteSettings() {
  const t = useTranslations("website")
  const [saved, setSaved] = useState<WebsiteState | null>(null)
  const [draft, setDraft] = useState<WebsiteSave | null>(null)
  const [servicesText, setServicesText] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [origin, setOrigin] = useState("")
  const [mobilePreview, setMobilePreview] = useState(false)

  const accept = useCallback((site: WebsiteState) => {
    setSaved(site)
    setDraft({ slug: site.slug, content: site.content })
    setServicesText(site.content.services.join("\n"))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try { accept(await api.getWebsite()) }
    catch (err) { setError(err instanceof Error ? err.message : t("loadError")) }
    finally { setLoading(false) }
  }, [accept, t])

  useEffect(() => { void load(); setOrigin(window.location.origin) }, [load])

  const dirty = !!saved && !!draft && JSON.stringify(draft) !== JSON.stringify({ slug: saved.slug, content: saved.content })
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function update<K extends keyof WebsiteContent>(key: K, value: WebsiteContent[K]) {
    setDraft((previous) => previous ? { ...previous, content: { ...previous.content, [key]: value } } : previous)
    setMessage("")
  }

  async function save(publish: boolean) {
    if (!draft) return
    if (!draft.content.company_name.trim() || !draft.content.headline.trim()) {
      setError(t("requiredError"))
      return
    }
    if (draft.content.services.length > 12 || draft.content.services.some((service) => service.length > 80)) {
      setError(t("servicesError"))
      return
    }
    if (!/^[0-9+().\-\s]*$/.test(draft.content.phone)) {
      setError(t("phoneError"))
      return
    }
    if ([draft.content.logo_url, draft.content.hero_image_url].some((url) => url && !/^https?:\/\//i.test(url.trim()))) {
      setError(t("imageError"))
      return
    }
    setBusy(publish ? "publish" : "save"); setError(""); setMessage("")
    try {
      accept(await (publish ? api.publishWebsite(draft) : api.saveWebsite(draft)))
      setMessage(publish ? t("publishedMessage") : t("savedMessage"))
    } catch (err) { setError(err instanceof Error ? err.message : t("saveError")) }
    finally { setBusy(null) }
  }

  async function unpublish() {
    setBusy("unpublish"); setError(""); setMessage("")
    try {
      // Keep any unsaved editor changes when taking the live version offline.
      setSaved(await api.unpublishWebsite())
      setMessage(t("unpublishedMessage"))
    } catch (err) { setError(err instanceof Error ? err.message : t("unpublishError")) }
    finally { setBusy(null) }
  }

  async function copyLink() {
    if (!saved) return
    try { await navigator.clipboard.writeText(`${origin}/sites/${saved.slug}`); setMessage(t("copiedMessage")) }
    catch { setError(t("copyError")) }
  }

  if (loading) return <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500" role="status"><Loader2 className="h-5 w-5 animate-spin" /> {t("loading")}</div>
  if (!saved || !draft) return <div role="alert" className="rounded-xl border bg-white p-8"><p className="text-red-700">{error}</p><Button onClick={load} variant="outline" className="mt-4">{t("retry")}</Button></div>

  const status = saved.is_published ? (dirty || saved.has_unpublished_changes ? t("liveChanges") : t("live")) : t("draft")

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500"><Globe className="h-4 w-4" /> {t("eyebrow")}</div><h1 className="text-3xl font-semibold tracking-tight">{t("name")}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{t("intro")}</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${saved.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{status}</span>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={(event) => { event.preventDefault(); void save(true) }}>
        <fieldset disabled={!!busy} className="min-w-0 space-y-7 disabled:opacity-70">
          <section aria-labelledby="template-heading">
            <div className="mb-4 flex items-baseline justify-between gap-4"><h2 id="template-heading" className="text-base font-semibold">{t("chooseLook")}</h2><span className="text-xs text-slate-500">{t("switchAnytime")}</span></div>
            <div className="grid gap-4 sm:grid-cols-3">
              {WEBSITE_TEMPLATES.map((template) => (
                <button type="button" key={template.id} aria-pressed={draft.content.template === template.id} onClick={() => update("template", template.id)} className={`overflow-hidden rounded-xl border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${draft.content.template === template.id ? "border-black bg-white" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                  <div aria-hidden="true" className={`${styles.thumbnail} ${styles[template.id]}`}><div className={styles.miniNav}><span>{t("demoBusiness")}</span><span>↗</span></div><div className={styles.miniHero}><div><p>{t("demoHeadline")}</p><span className={styles.miniButton}>{t("demoCta")}</span></div><div className={styles.miniArt}><i /><i /></div></div></div>
                  <div className="p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{t(`templates.${template.id}.name`)}</h3>{draft.content.template === template.id && <Check className="h-4 w-4" />}</div><p className="mt-1 text-xs leading-5 text-slate-500">{t(`templates.${template.id}.description`)}</p></div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="address-heading">
            <h2 id="address-heading" className="mb-4 text-base font-semibold">{t("claimAddress")}</h2>
            <Label htmlFor="website-slug">{t("address")}</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="max-w-full break-all text-sm text-slate-500">{origin}/sites/</span>
              <Input id="website-slug" value={draft.slug} disabled={!!saved.published_at || !!busy} onChange={(e) => { setDraft({ ...draft, slug: e.target.value.toLowerCase() }); setMessage("") }} minLength={3} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*" required className="w-full sm:w-64" aria-describedby="website-slug-help" />
              {saved.is_published && <><Button type="button" variant="outline" size="sm" onClick={copyLink}><Copy className="mr-2 h-3.5 w-3.5" /> {t("copyLink")}</Button><a href={`/sites/${saved.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 text-sm underline">{t("visit")} <ExternalLink className="h-3.5 w-3.5" /></a></>}
            </div>
            <p id="website-slug-help" className="mt-2 text-xs leading-5 text-slate-500">{saved.published_at ? t("permanentAddress") : t("addressHelp")}</p>
          </section>

          <section aria-labelledby="content-heading">
            <h2 id="content-heading" className="mb-4 text-base font-semibold">{t("makeYours")}</h2>
            <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs leading-5 text-slate-500">{t("publicNotice")}</p>
                <Field label={t("businessName")} id="website-company"><Input id="website-company" required maxLength={255} value={draft.content.company_name} onChange={(e) => update("company_name", e.target.value)} /></Field>
                <Field label={t("headline")} id="website-headline"><Textarea id="website-headline" required maxLength={120} value={draft.content.headline} onChange={(e) => update("headline", e.target.value)} /></Field>
                <Field label={t("description")} id="website-description"><Textarea id="website-description" maxLength={400} value={draft.content.description} onChange={(e) => update("description", e.target.value)} /></Field>
                <Field label={t("services")} id="website-services"><Textarea id="website-services" rows={4} value={servicesText} placeholder={t("servicesPlaceholder")} onChange={(e) => { setServicesText(e.target.value); update("services", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)) }} /></Field>
                <Field label={t("about")} id="website-about"><Textarea id="website-about" rows={5} maxLength={2500} value={draft.content.about} onChange={(e) => update("about", e.target.value)} /></Field>
                <Field label={t("area")} id="website-area"><Input id="website-area" maxLength={200} placeholder={t("areaPlaceholder")} value={draft.content.service_area} onChange={(e) => update("service_area", e.target.value)} /></Field>
                <Field label={t("phone")} id="website-phone"><Input id="website-phone" type="tel" maxLength={30} value={draft.content.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
                <Field label={t("email")} id="website-email"><Input id="website-email" type="email" value={draft.content.email || ""} onChange={(e) => update("email", e.target.value || null)} /></Field>
                <Field label={t("logo")} id="website-logo"><Input id="website-logo" type="url" placeholder="https://…" value={draft.content.logo_url || ""} onChange={(e) => update("logo_url", e.target.value || null)} /></Field>
                <Field label={t("image")} id="website-image"><Input id="website-image" type="url" placeholder="https://…" value={draft.content.hero_image_url || ""} onChange={(e) => update("hero_image_url", e.target.value || null)} /></Field>
                <p className="text-xs leading-5 text-slate-500">{t("imageHelp")}</p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 xl:sticky xl:top-6">
                <div className="flex items-center justify-between border-b bg-white px-4 py-3"><span className="text-xs font-medium text-slate-600">{t("preview")}</span><div className="flex gap-1"><Button type="button" size="sm" variant={mobilePreview ? "ghost" : "secondary"} aria-label={t("widePreview")} aria-pressed={!mobilePreview} onClick={() => setMobilePreview(false)}><Monitor className="h-4 w-4" /></Button><Button type="button" size="sm" variant={mobilePreview ? "secondary" : "ghost"} aria-label={t("mobilePreview")} aria-pressed={mobilePreview} onClick={() => setMobilePreview(true)}><Smartphone className="h-4 w-4" /></Button></div></div>
                <div className="max-h-[760px] overflow-y-auto"><div className={mobilePreview ? "mx-auto max-w-[390px]" : "w-full"}><ContractorWebsite site={{ ...draft, contractor_uuid: saved.contractor_uuid, booking_slug: saved.booking_slug }} preview /></div></div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div><p className="text-sm font-medium">{dirty ? t("unsaved") : saved.has_unpublished_changes ? t("readyToPublish") : t("changesSaved")}</p><p className="mt-1 text-xs text-slate-500">{t("draftHelp")}</p></div>
            <div className="flex flex-wrap gap-2">
              {saved.is_published && <Button type="button" variant="ghost" onClick={unpublish}>{busy === "unpublish" ? t("unpublishing") : t("unpublish")}</Button>}
              <Button type="button" variant="outline" onClick={(event) => { if (event.currentTarget.form?.reportValidity()) void save(false) }}>{busy === "save" ? t("saving") : t("saveDraft")}</Button>
              <Button type="submit" className="bg-black text-white hover:bg-black/80">{busy === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}{saved.is_published ? t("publishChanges") : t("publish")}</Button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-xs text-slate-600">{label}</Label>{children}</div>
}
