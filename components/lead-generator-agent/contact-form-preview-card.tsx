"use client"

import { useState } from "react"
import { ExternalLink, FileText, Loader2, RefreshCw, AlertCircle } from "lucide-react"

import { api } from "@/lib/api"
import type {
  ContactFormSubmission,
  ContactFormSubmissionListResponse,
} from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ContactFormPreviewCardProps {
  campaignUuid: string
  submissions: ContactFormSubmission[]
  onChange: (next: ContactFormSubmission[]) => void
}

const STATUS_LABELS: Record<ContactFormSubmission["status"], string> = {
  DRAFT: "Draft",
  REGENERATED: "Regenerated",
  APPROVED: "Approved",
  QUEUED: "Queued",
  SENT: "Sent",
  FAILED: "Failed",
  SKIPPED_UNSUPPORTED: "Skipped",
}

const STATUS_TONE: Record<ContactFormSubmission["status"], string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  REGENERATED: "border-sky-200 bg-sky-50 text-sky-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  QUEUED: "border-violet-200 bg-violet-50 text-violet-700",
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  SKIPPED_UNSUPPORTED: "border-amber-200 bg-amber-50 text-amber-700",
}

export function ContactFormPreviewCard({
  campaignUuid,
  submissions,
  onChange,
}: ContactFormPreviewCardProps) {
  const [staging, setStaging] = useState(false)
  const [stageError, setStageError] = useState<string | null>(null)

  if (submissions.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            Contact-form outreach
          </CardTitle>
          <CardDescription>
            No contact-form previews staged for this campaign yet. If discovery
            detected forms on any of the approved leads, you can stage previews
            now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={staging}
            onClick={async () => {
              setStaging(true)
              setStageError(null)
              try {
                const res: ContactFormSubmissionListResponse =
                  await api.stageContactFormSubmissions(campaignUuid)
                onChange(res.submissions)
              } catch (err) {
                setStageError(err instanceof Error ? err.message : "Failed to stage forms")
              } finally {
                setStaging(false)
              }
            }}
          >
            {staging ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Stage contact-form previews
          </Button>
          {stageError ? (
            <div className="mt-3 text-xs text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {stageError}
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          Contact-form previews
          <Badge variant="outline" className="ml-1 text-xs">
            {submissions.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Read-only preview of what we would submit through each lead&apos;s contact
          form. No form submissions are sent yet — this is the staging step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((submission) => (
          <SubmissionRow
            key={submission.uuid}
            submission={submission}
            onUpdated={(updated) => {
              onChange(submissions.map((s) => (s.uuid === updated.uuid ? updated : s)))
            }}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function SubmissionRow({
  submission,
  onUpdated,
}: {
  submission: ContactFormSubmission
  onUpdated: (next: ContactFormSubmission) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hostname = safeHostname(submission.form_url)
  const skipped = submission.status === "SKIPPED_UNSUPPORTED"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <span className="truncate">{hostname}</span>
            <a
              href={submission.form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-700"
              title="Open form in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="text-xs text-slate-500">
            {submission.form_provider ?? "native_html"}
          </div>
        </div>
        <Badge variant="outline" className={`text-xs ${STATUS_TONE[submission.status]}`}>
          {STATUS_LABELS[submission.status]}
        </Badge>
      </div>

      {skipped ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {submission.last_error ?? "This form can't be filled automatically."}
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {submission.field_schema.map((field) => {
              const mapped = submission.field_mapping[field.name]
              return (
                <div
                  key={field.name}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                    <span>{field.label || field.name}</span>
                    <span className="text-slate-400">{field.type}</span>
                  </div>
                  <div className="mt-1 break-words text-sm text-slate-900">
                    {mapped ? (
                      mapped.value
                    ) : (
                      <span className="text-slate-400 italic">not filled</span>
                    )}
                  </div>
                  {mapped ? (
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      from {mapped.source}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {submission.unmapped_fields.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {submission.unmapped_fields.length} field
              {submission.unmapped_fields.length !== 1 ? "s" : ""} couldn&apos;t be mapped:
              <span className="ml-1 font-medium">
                {submission.unmapped_fields
                  .map((f) => (f.label || f.name) as string)
                  .filter(Boolean)
                  .slice(0, 6)
                  .join(", ")}
              </span>
            </div>
          )}

          {submission.drafted_message ? (
            <div>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                {expanded ? "Hide drafted message" : "Show drafted message"}
              </button>
              {expanded ? (
                <div className="mt-2 space-y-2">
                  {submission.drafted_subject ? (
                    <div className="text-sm font-medium text-slate-900">
                      {submission.drafted_subject}
                    </div>
                  ) : null}
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-sans">
                    {submission.drafted_message}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">
          Updated {new Date(submission.updated_at).toLocaleString()}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs"
          disabled={regenerating}
          onClick={async () => {
            setRegenerating(true)
            setError(null)
            try {
              const updated = await api.regenerateContactFormSubmission(submission.uuid)
              onUpdated(updated)
            } catch (err) {
              setError(err instanceof Error ? err.message : "Regenerate failed")
            } finally {
              setRegenerating(false)
            }
          }}
        >
          {regenerating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Regenerate
        </Button>
      </div>
      {error ? (
        <div className="text-xs text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      ) : null}
    </div>
  )
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
