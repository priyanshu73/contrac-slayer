"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Edit3, Loader2, Send, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import type { CampaignDetail } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ReviewEmailUIProps = {
  campaign: CampaignDetail
  pendingAction: string | null
  onApproveAll: () => Promise<void> | void
  onReload: () => Promise<void> | void
}

type CampaignLeadRecord = CampaignDetail["leads"][number]

function getLeadEmail(lead: CampaignLeadRecord | undefined) {
  return (
    lead?.email ||
    lead?.meta_context?.contact_data?.primary_email ||
    lead?.meta_context?.emails?.[0]?.email ||
    "Unknown"
  )
}

function getLeadDomain(lead: CampaignLeadRecord | undefined) {
  const email = getLeadEmail(lead)
  if (email !== "Unknown" && email.includes("@")) return email.split("@")[1]
  return lead?.website || lead?.domain || "No domain"
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function avatarTone(seed: string) {
  const tones = [
    "bg-emerald-700",
    "bg-sky-700",
    "bg-indigo-700",
    "bg-teal-700",
    "bg-cyan-700",
    "bg-lime-700",
  ]
  const code = seed.charCodeAt(0) || 0
  return tones[code % tones.length]
}

function splitEmailSections(body: string) {
  const parts = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return []

  return parts.map((content, index) => {
    const lower = content.toLowerCase()

    if (index === 0) {
      return {
        label: null,
        helper: null,
        tone: "plain",
        content,
      }
    }

    if (lower.includes("thank you") || lower.startsWith("best regards") || lower.startsWith("best,") || lower.startsWith("sincerely")) {
      return {
        label: null,
        helper: null,
        tone: "plain",
        content,
      }
    }

    if (
      lower.includes("please let me know") ||
      lower.includes("i would be happy") ||
      lower.includes("reply") ||
      lower.includes("walkthrough") ||
      lower.includes("site visit") ||
      lower.includes("introduction")
    ) {
      return {
        label: "Call to Action",
        helper: "Asks for the next step in a low-pressure way.",
        tone: "amber",
        content,
      }
    }

    if (
      lower.includes("we specialize") ||
      lower.includes("our services") ||
      lower.includes("our team can assist") ||
      lower.includes("we support") ||
      lower.includes("we provide")
    ) {
      return {
        label: "Services & Value",
        helper: "Explains what the contractor offers and why it matters.",
        tone: "sky",
        content,
      }
    }

    return {
      label: null,
      helper: null,
      tone: "plain",
      content,
    }
  })
}

function sectionToneClasses(tone: string) {
  const palette: Record<string, string> = {
    plain: "border-transparent bg-transparent text-inherit",
    sky: "border-sky-100 bg-sky-50/40 text-inherit",
    amber: "border-amber-100 bg-amber-50/40 text-inherit",
  }
  return palette[tone] ?? palette.plain
}

export default function ReviewEmailUI({
  campaign,
  pendingAction,
  onApproveAll,
  onReload,
}: ReviewEmailUIProps) {
  const drafts = campaign.email_drafts ?? []
  const leadsById = useMemo(
    () => new Map((campaign.leads ?? []).map((lead) => [lead.id, lead])),
    [campaign.leads]
  )

  const [selectedDraftUuid, setSelectedDraftUuid] = useState<string>(drafts[0]?.uuid ?? "")
  const [editMode, setEditMode] = useState(false)
  const [polishMode, setPolishMode] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!drafts.length) {
      setSelectedDraftUuid("")
      return
    }
    const stillExists = drafts.some((draft) => draft.uuid === selectedDraftUuid)
    if (!stillExists) setSelectedDraftUuid(drafts[0].uuid)
  }, [drafts, selectedDraftUuid])

  const selectedIndex = Math.max(0, drafts.findIndex((draft) => draft.uuid === selectedDraftUuid))
  const selectedDraft = drafts[selectedIndex] ?? drafts[0]
  const selectedLead = selectedDraft ? leadsById.get(selectedDraft.campaign_lead_id) : undefined
  const emailSections = splitEmailSections(selectedDraft?.body ?? "")

  useEffect(() => {
    if (!selectedDraft) return
    setSubject(selectedDraft.subject)
    setBody(selectedDraft.body)
    setEditMode(false)
    setPolishMode(false)
    setNotes("")
  }, [selectedDraft?.uuid])

  const approvedCount = drafts.filter((draft) => ["APPROVED", "QUEUED", "SENT"].includes(draft.status)).length
  const allApproved = drafts.length > 0 && approvedCount === drafts.length

  const handleSave = async () => {
    if (!selectedDraft) return
    try {
      setSaving(true)
      await api.updateCampaignDraft(selectedDraft.uuid, { subject, body })
      await onReload()
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  const handlePolish = async () => {
    if (!selectedDraft || !notes.trim()) return
    try {
      setSaving(true)
      await api.polishCampaignDraft(selectedDraft.uuid, notes.trim())
      await onReload()
      setPolishMode(false)
      setNotes("")
    } finally {
      setSaving(false)
    }
  }

  const handleApproveAll = async () => {
    await onApproveAll()
    setShowBanner(true)
    window.setTimeout(() => setShowBanner(false), 4000)
  }

  if (!selectedDraft) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No email drafts ready yet.
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#E8EBE6] bg-[#F4F6F3] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EBE6] bg-white px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9AAB94]">Review Email Drafts</p>
            <p className="mt-1 text-sm font-semibold text-[#2C3A28]">{campaign.name}</p>
          </div>
          <span className="rounded-full bg-[#FFF3CD] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#92680A]">
            Needs Approval
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#7A8A75]">
            {approvedCount} of {drafts.length} approved
          </span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#E8EBE6]">
            <div
              className="h-full rounded-full bg-[#2D6A4F] transition-all duration-300"
              style={{ width: `${drafts.length ? (approvedCount / drafts.length) * 100 : 0}%` }}
            />
          </div>
          <Button
            className="rounded-lg bg-[#1B4332] px-4 text-xs font-semibold text-white hover:bg-[#173a2b]"
            disabled={!!pendingAction || allApproved}
            onClick={handleApproveAll}
          >
            {pendingAction === "approve-messaging" ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-2 h-3.5 w-3.5" />
            )}
            {allApproved ? "All Approved" : "Approve All & Send"}
          </Button>
        </div>
      </div>

      {showBanner ? (
        <div className="border-b border-[#28543f] bg-[#2D6A4F] px-5 py-3 text-sm font-medium text-white">
          All {drafts.length} emails approved and queued for sending.
        </div>
      ) : null}

      <div className="flex min-h-[620px]">
        <aside className="w-[290px] shrink-0 border-r border-[#E8EBE6] bg-white">
          <div className="border-b border-[#E8EBE6] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9AAB94]">
              Recipients · {drafts.length}
            </p>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {drafts.map((draft) => {
              const lead = leadsById.get(draft.campaign_lead_id)
              const selected = draft.uuid === selectedDraft.uuid
              const approved = ["APPROVED", "QUEUED", "SENT"].includes(draft.status)
              const name = lead?.business_name || "Unknown Business"

              return (
                <button
                  key={draft.uuid}
                  type="button"
                  onClick={() => setSelectedDraftUuid(draft.uuid)}
                  className={`flex w-full items-center gap-3 border-b border-[#F0F2EE] px-4 py-3 text-left transition-colors ${
                    selected ? "border-l-[3px] border-l-[#2D6A4F] bg-[#F0F4EE]" : "border-l-[3px] border-l-transparent hover:bg-[#F8FAF7]"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(name)}`}>
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#2C3A28]">{name}</p>
                    <p className="truncate text-xs text-[#9AAB94]">{getLeadDomain(lead)}</p>
                  </div>
                  {approved ? (
                    <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#2D6A4F] text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#F4F6F3]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EBE6] bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${avatarTone(selectedLead?.business_name || "X")}`}>
                {initials(selectedLead?.business_name || "Unknown")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[#2C3A28]">{selectedLead?.business_name || "Unknown Business"}</p>
                <p className="truncate text-xs text-[#9AAB94]">{getLeadEmail(selectedLead)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-lg border-[#D0D8CC] text-xs font-semibold text-[#5A6E54] hover:bg-[#F4F6F3]"
                onClick={() => {
                  setEditMode((value) => !value)
                  setPolishMode(false)
                }}
              >
                <Edit3 className="mr-2 h-3.5 w-3.5" />
                {editMode ? "Done" : "Edit"}
              </Button>
              <Button
                variant="outline"
                className="rounded-lg border-[#D0D8CC] text-xs font-semibold text-[#5A6E54] hover:bg-[#F4F6F3]"
                onClick={() => {
                  setPolishMode((value) => !value)
                  setEditMode(false)
                }}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                AI Polish
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#E8EBE6] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="border-b border-[#F0F2EE] bg-[#FAFBF9] px-6 py-5">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9AAB94]">
                  Subject
                </label>
                {editMode ? (
                  <Input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="border-[#D0D8CC] text-sm font-semibold text-[#2C3A28]"
                  />
                ) : (
                  <p className="text-sm font-semibold text-[#2C3A28]">{selectedDraft.subject}</p>
                )}
              </div>

              <div className="px-6 py-6">
                {polishMode ? (
                  <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                    <div className="mb-2 flex items-center text-xs font-semibold text-sky-800">
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Magic Polish
                    </div>
                    <Textarea
                      className="min-h-[80px] border-sky-100 bg-white text-sm"
                      placeholder="Make it friendlier, sharper, more concise, or more specific."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={saving}
                    />
                    <Button
                      className="mt-3 bg-sky-600 text-white hover:bg-sky-700"
                      disabled={saving || !notes.trim()}
                      onClick={handlePolish}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Polish"}
                    </Button>
                  </div>
                ) : null}

                {editMode ? (
                  <div className="space-y-3">
                    <Textarea
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      className="min-h-[320px] border-[#D0D8CC] bg-[#FAFBF9] font-mono text-sm leading-7 text-[#2C3A28]"
                    />
                    <div className="flex justify-end">
                      <Button className="bg-indigo-600 text-white hover:bg-indigo-700" disabled={saving} onClick={handleSave}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailSections.map((section, index) => (
                      <div
                        key={`${section.label}-${index}`}
                        className={`rounded-2xl border px-4 py-3 ${sectionToneClasses(section.tone)}`}
                      >
                        {section.label ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B7D65]">
                              {section.label}
                            </div>
                            {section.helper ? (
                              <div className="text-[11px] text-[#8DA087]">
                                {section.helper}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <div className={`${section.label ? "mt-2" : ""} whitespace-pre-wrap break-words font-sans text-sm leading-8 text-[#3A4A36]`}>
                          {section.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!editMode ? (
                <div className="border-t border-[#F0F2EE] bg-[#F8FAF7] px-6 py-3">
                  <span className="text-xs italic text-[#B0BCA9]">
                    AI-personalized for {selectedLead?.business_name || "this recipient"} based on your campaign brief.
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#E8EBE6] bg-white px-6 py-3">
            <Button
              variant="outline"
              className="rounded-lg border-[#D0D8CC] text-xs font-semibold text-[#5A6E54] hover:bg-[#F4F6F3]"
              disabled={selectedIndex === 0}
              onClick={() => setSelectedDraftUuid(drafts[selectedIndex - 1]?.uuid ?? selectedDraft.uuid)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>

            <span className="text-xs text-[#9AAB94]">
              {selectedIndex + 1} / {drafts.length}
            </span>

            <Button
              variant="outline"
              className="rounded-lg border-[#D0D8CC] text-xs font-semibold text-[#5A6E54] hover:bg-[#F4F6F3]"
              disabled={selectedIndex === drafts.length - 1}
              onClick={() => setSelectedDraftUuid(drafts[selectedIndex + 1]?.uuid ?? selectedDraft.uuid)}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </main>
      </div>
    </section>
  )
}
