"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CalendarIcon,
  ClockIcon,
  MailIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  TrashIcon,
  PencilIcon,
  SearchIcon,
  FilterIcon,
  Loader2Icon,
  InfoIcon,
  Link2Icon,
  AlertTriangleIcon,
  RefreshCwIcon,
  SendIcon,
  CheckCircle2Icon,
  UsersIcon,
  BotIcon,
  UserIcon,
  ZapIcon,
  PhoneIcon,
  BellIcon,
  CheckCheckIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import type {
  ScheduledFollowup,
  FollowupStatus,
  FollowupType,
  FollowupSource,
  CancelReason,
  DeliveryStatus,
} from "@/lib/types/followup"
import { api } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"

/** "Who sent it" chip. */
export function SourceBadge({ source, className }: { source?: FollowupSource | null; className?: string }) {
  const t = useTranslations("scheduling.list")
  const meta: Record<FollowupSource, { icon: React.ReactNode; label: string; cls: string }> = {
    automation: { icon: <ZapIcon className="h-3 w-3" />, label: t("sourceAutomation"), cls: "bg-violet-500/10 text-violet-600" },
    owner: { icon: <UserIcon className="h-3 w-3" />, label: t("sourceOwner"), cls: "bg-slate-500/10 text-slate-600" },
    ai_agent: { icon: <BotIcon className="h-3 w-3" />, label: t("sourceAiAgent"), cls: "bg-sky-500/10 text-sky-600" },
    frontline: { icon: <PhoneIcon className="h-3 w-3" />, label: t("sourceFrontline"), cls: "bg-amber-500/10 text-amber-600" },
    system: { icon: <BellIcon className="h-3 w-3" />, label: t("sourceSystem"), cls: "bg-slate-500/10 text-slate-600" },
  }
  const m = meta[(source ?? "owner") as FollowupSource] ?? meta.owner
  return (
    <Badge variant="secondary" className={cn("gap-1 px-1.5 py-0 text-[10px] font-medium", m.cls, className)}>
      {m.icon}
      {m.label}
    </Badge>
  )
}

/** Carrier delivery state, only shown once a row was sent. */
export function DeliveryBadge({ status, code, className }: { status?: DeliveryStatus | null; code?: string | null; className?: string }) {
  const t = useTranslations("scheduling.list")
  if (!status || status === "queued") return null
  const meta: Record<Exclude<DeliveryStatus, "queued">, { icon: React.ReactNode; label: string; cls: string }> = {
    sent: { icon: <ClockIcon className="h-3 w-3" />, label: t("deliverySent"), cls: "bg-blue-500/10 text-blue-600" },
    delivered: { icon: <CheckCheckIcon className="h-3 w-3" />, label: t("deliveryDelivered"), cls: "bg-green-500/10 text-green-600" },
    undelivered: { icon: <AlertTriangleIcon className="h-3 w-3" />, label: t("deliveryUndelivered"), cls: "bg-red-500/10 text-red-600" },
    failed: { icon: <AlertTriangleIcon className="h-3 w-3" />, label: t("deliveryFailed"), cls: "bg-red-500/10 text-red-600" },
  }
  const m = meta[status]
  const chip = (
    <Badge variant="secondary" className={cn("gap-1 px-1.5 py-0 text-[10px] font-medium", m.cls, className)}>
      {m.icon}
      {m.label}
    </Badge>
  )
  if (!code) return chip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>{t("carrierCode", { code })}</TooltipContent>
    </Tooltip>
  )
}

export function useCancelReasonLabel() {
  const t = useTranslations("scheduling.list")
  return (reason?: CancelReason | string | null): string | null => {
    if (!reason) return null
    const map: Record<string, string> = {
      customer_replied: t("reasonCustomerReplied"),
      quote_accepted: t("reasonQuoteAccepted"),
      quote_rejected: t("reasonQuoteRejected"),
      quote_closed: t("reasonQuoteClosed"),
      booking_cancelled: t("reasonBookingCancelled"),
      booking_rescheduled: t("reasonBookingRescheduled"),
      booking_passed: t("reasonBookingPassed"),
      booking_created: t("reasonBookingCreated"),
      form_submitted: t("reasonFormSubmitted"),
      owner_cancelled: t("reasonOwnerCancelled"),
      automation_disabled: t("reasonAutomationDisabled"),
      opted_out: t("reasonOptedOut"),
      sequence_cancelled: t("reasonSequenceCancelled"),
    }
    return map[reason] ?? reason
  }
}

/** "Step 2 of 3" for cadence rows. */
export function StepLabel({ f }: { f: Pick<ScheduledFollowup, "step_number" | "total_steps"> }) {
  const t = useTranslations("scheduling.list")
  if (!f.step_number || !f.total_steps) return null
  return <span className="text-xs text-muted-foreground">{t("stepOf", { step: f.step_number, total: f.total_steps })}</span>
}

/**
 * Pull URLs out of a message and label them by what they link to, so the preview
 * can render compact chips (e.g. "View Proposal →") instead of long raw links.
 */
function extractUrls(text: string): { cleanText: string; urls: Array<{ href: string; label: string }> } {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const urls: Array<{ href: string; label: string }> = []
  const cleanText = text
    .replace(urlRegex, (url) => {
      let label = "View Link"
      if (/\/proposals?\//i.test(url)) label = "View Proposal"
      else if (/\/quote-request\//i.test(url) || /\/request\//i.test(url)) label = "Quote Request"
      else if (/\/quotes?\//i.test(url)) label = "View Quote"
      else if (/\/book(ing)?\//i.test(url)) label = "Book Appointment"
      urls.push({ href: url, label })
      return ""
    })
    .replace(/\s{2,}/g, " ")
    .trim()
  return { cleanText, urls }
}

/** Parse a backend datetime string as UTC (it may or may not carry a tz suffix). */
function toUtcDate(dateString: string): Date {
  const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
  return new Date(utcString)
}

export interface FollowupStats {
  total: number
  pending: number
  sent: number
  failed: number
}

interface ScheduledFollowupsListProps {
  /** Legacy prop; linking is checked by the backend now. */
  contractorId?: number
  /** Bump to force a refetch (e.g. after scheduling a new follow-up). */
  refreshKey?: number
  /** Reports stats for the full (unfiltered) set so a parent can render them. */
  onStatsChange?: (stats: FollowupStats) => void
  /** Launch the schedule dialog from the empty state, if provided. */
  onSchedule?: () => void
  /** Edit a pending follow-up (opens the dialog prefilled). */
  onEdit?: (followup: ScheduledFollowup) => void
}

const followupTypeIcons: Record<FollowupType, React.ReactNode> = {
  appointment_1day: <CalendarIcon className="h-4 w-4" />,
  appointment_1hour: <ClockIcon className="h-4 w-4" />,
  quote: <FileTextIcon className="h-4 w-4" />,
  intake_step: <FileTextIcon className="h-4 w-4" />,
  booking_step: <CalendarIcon className="h-4 w-4" />,
  custom: <MailIcon className="h-4 w-4" />,
}

const statusColors: Record<FollowupStatus, string> = {
  pending: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  sent: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  failed: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
}

/** How many history items to render before requiring "Load More". */
const PAGE_SIZE = 10
const SOURCES: FollowupSource[] = ["automation", "owner", "ai_agent", "frontline", "system"]

export function ScheduledFollowupsList({
  refreshKey = 0,
  onStatsChange,
  onSchedule,
  onEdit,
}: ScheduledFollowupsListProps) {
  const t = useTranslations("scheduling")
  const reasonLabel = useCancelReasonLabel()
  const [followups, setFollowups] = useState<ScheduledFollowup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notLinked, setNotLinked] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FollowupType | "all">("all")
  const [sourceFilter, setSourceFilter] = useState<FollowupSource | "all">("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [followupToDelete, setFollowupToDelete] = useState<number | null>(null)
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const [visibleHistory, setVisibleHistory] = useState(PAGE_SIZE)
  const { toast } = useToast()

  const typeLabels: Record<FollowupType, string> = {
    appointment_1day: t("list.typeAppointment1day"),
    appointment_1hour: t("list.typeAppointment1hour"),
    quote: t("list.typeQuote"),
    intake_step: t("list.typeIntakeStep"),
    booking_step: t("list.typeBookingStep"),
    custom: t("list.typeCustom"),
  }
  const sourceLabels: Record<FollowupSource, string> = {
    automation: t("list.sourceAutomation"),
    owner: t("list.sourceOwner"),
    ai_agent: t("list.sourceAiAgent"),
    frontline: t("list.sourceFrontline"),
    system: t("list.sourceSystem"),
  }

  const onStatsChangeRef = useRef(onStatsChange)
  onStatsChangeRef.current = onStatsChange

  const reportStats = useCallback((items: ScheduledFollowup[]) => {
    onStatsChangeRef.current?.({
      total: items.length,
      pending: items.filter((f) => f.status === "pending").length,
      sent: items.filter((f) => f.status === "sent").length,
      failed: items.filter((f) => f.status === "failed").length,
    })
  }, [])

  const fetchFollowups = useCallback(async () => {
    try {
      setIsLoading(true)
      setNotLinked(false)
      const data = await api.getScheduledFollowups({ status: "all", limit: 300 })
      const rows = data.followups ?? []
      setFollowups(rows)
      reportStats(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (/not linked|messaging service|contact not found/i.test(message)) {
        setFollowups([])
        reportStats([])
        setNotLinked(true)
      } else {
        toast({ title: t("settings.error"), description: message || t("list.loadFailed"), variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
    }
    // t intentionally omitted: it is stable per-locale and including it would refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStats, toast])

  useEffect(() => {
    fetchFollowups()
  }, [fetchFollowups, refreshKey])

  const filteredFollowups = followups.filter((followup) => {
    if (typeFilter !== "all" && followup.followup_type !== typeFilter) return false
    if (sourceFilter !== "all" && followup.source !== sourceFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (followup.customer_name ?? "").toLowerCase().includes(query) ||
        followup.message_text.toLowerCase().includes(query) ||
        followup.customer_number.includes(query)
      )
    }
    return true
  })

  const byScheduledAsc = (a: ScheduledFollowup, b: ScheduledFollowup) =>
    toUtcDate(a.scheduled_for).getTime() - toUtcDate(b.scheduled_for).getTime()
  const byScheduledDesc = (a: ScheduledFollowup, b: ScheduledFollowup) => -byScheduledAsc(a, b)

  // Failures and undelivered texts need action; upcoming is what's queued; history is the rest.
  const needsAttention = filteredFollowups
    .filter((f) => f.status === "failed" || f.delivery_status === "undelivered")
    .sort(byScheduledDesc)
  const upcomingItems = filteredFollowups.filter((f) => f.status === "pending").sort(byScheduledAsc)
  const historyItems = filteredFollowups
    .filter((f) => (f.status === "sent" && f.delivery_status !== "undelivered") || f.status === "cancelled")
    .sort(byScheduledDesc)

  const visibleHistoryItems = historyItems.slice(0, visibleHistory)
  const hasMoreHistory = historyItems.length > visibleHistory

  useEffect(() => {
    setVisibleHistory(PAGE_SIZE)
  }, [searchQuery, typeFilter, sourceFilter, followups])

  const handleDeleteConfirm = async () => {
    if (!followupToDelete) return
    try {
      await api.cancelFollowup(followupToDelete)
      await fetchFollowups()
      toast({ title: t("list.cancelConfirmTitle"), description: t("list.cancelledSuccess") })
    } catch (error) {
      toast({
        title: t("settings.error"),
        description: error instanceof Error ? error.message : t("list.cancelFailed"),
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setFollowupToDelete(null)
    }
  }

  const handleRetry = async (followup: ScheduledFollowup) => {
    setRetryingId(followup.id)
    try {
      await api.retryFollowup(followup.id)
      toast({ title: t("list.retrySuccessTitle"), description: t("list.retrySuccess") })
      await fetchFollowups()
    } catch (error) {
      toast({
        title: t("settings.error"),
        description: error instanceof Error ? error.message : t("list.retryFailed"),
        variant: "destructive",
      })
    } finally {
      setRetryingId(null)
    }
  }

  const getRelativeTime = (dateString: string) => {
    try {
      const date = toUtcDate(dateString)
      const diffInHours = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60))
      if (diffInHours < 0) {
        const absDiff = Math.abs(diffInHours)
        if (absDiff < 24) return `${absDiff}h ago`
        return `${Math.floor(absDiff / 24)}d ago`
      }
      if (diffInHours < 24) return `in ${diffInHours}h`
      return `in ${Math.floor(diffInHours / 24)}d`
    } catch {
      return ""
    }
  }

  const formatShortDate = (dateString: string) => {
    try {
      return format(toUtcDate(dateString), "MMM d, h:mm a")
    } catch {
      return dateString
    }
  }

  const renderCard = (followup: ScheduledFollowup) => {
    const { cleanText, urls } = extractUrls(followup.message_text)
    const reason = followup.status === "cancelled" ? reasonLabel(followup.cancel_reason) : null
    const failure =
      followup.status === "failed" || followup.delivery_status === "undelivered"
        ? followup.error_message || reasonLabel(followup.cancel_reason)
        : null
    const name = followup.customer_name || formatPhoneForDisplay(followup.customer_number) || "—"
    return (
      <div key={followup.id} className="rounded-lg border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 shrink-0 text-muted-foreground">{followupTypeIcons[followup.followup_type]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {followup.links?.client ? (
                  <Link href={followup.links.client} className="truncate text-sm font-semibold hover:underline">
                    {name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-semibold">{name}</span>
                )}
                <SourceBadge source={followup.source} />
                <StepLabel f={followup} />
              </div>
              {cleanText && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{cleanText}</p>}
              {(urls.length > 0 || followup.links?.quote) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {urls.map((u, i) => (
                    <a
                      key={i}
                      href={u.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary no-underline transition-colors hover:bg-primary/20"
                    >
                      <Link2Icon className="h-3 w-3 shrink-0" />
                      {u.label} →
                    </a>
                  ))}
                  {followup.links?.quote && !urls.some((u) => /\/quotes?\//i.test(u.href)) && (
                    <Link
                      href={followup.links.quote}
                      className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium no-underline hover:bg-muted/80"
                    >
                      <FileTextIcon className="h-3 w-3 shrink-0" />
                      {t("list.openQuote")}
                    </Link>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatShortDate(followup.scheduled_for)} · {getRelativeTime(followup.scheduled_for)}
                {followup.followup_type !== "custom" && <> · {typeLabels[followup.followup_type]}</>}
              </p>
              {failure && <p className="mt-1 text-xs text-red-500">{failure}</p>}
              {reason && <p className="mt-1 text-xs text-muted-foreground">{t("list.stoppedBecause", { reason })}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <Badge className={statusColors[followup.status]} variant="secondary">
                {t(`list.${followup.status}` as "list.pending" | "list.sent" | "list.failed" | "list.cancelled")}
              </Badge>
              {followup.status === "pending" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(followup)}>
                        <PencilIcon className="mr-2 h-4 w-4" />
                        {t("list.edit")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setFollowupToDelete(followup.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      {t("list.cancelFollowup")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {followup.status === "sent" && (
              <DeliveryBadge status={followup.delivery_status} code={followup.delivery_error_code} />
            )}
            {followup.status === "failed" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={retryingId === followup.id}
                onClick={() => handleRetry(followup)}
              >
                {retryingId === followup.id ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCwIcon className="mr-1 h-3.5 w-3.5" />
                )}
                {t("list.retry")}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderSection = (title: string, icon: React.ReactNode, items: ScheduledFollowup[], tone?: "danger") => {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <span className={cn("shrink-0", tone === "danger" ? "text-red-500" : "text-muted-foreground")}>{icon}</span>
          <h3 className={cn("text-xs font-semibold uppercase tracking-wider", tone === "danger" ? "text-red-500" : "text-muted-foreground")}>
            {title}
          </h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <div className="space-y-2">{items.map(renderCard)}</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notLinked) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>{t("list.spRequired")}</AlertDescription>
      </Alert>
    )
  }

  const isFiltering = Boolean(searchQuery) || typeFilter !== "all" || sourceFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("list.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FollowupType | "all")}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <FilterIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("list.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.allTypes")}</SelectItem>
            {(Object.keys(typeLabels) as FollowupType[]).map((k) => (
              <SelectItem key={k} value={k}>{typeLabels[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as FollowupSource | "all")}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <UsersIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("list.filterBySource")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.allSources")}</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{sourceLabels[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredFollowups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MailIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t("list.noFollowups")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{isFiltering ? t("list.tryFilters") : t("list.getStarted")}</p>
          {!isFiltering && onSchedule && (
            <Button className="mt-4" onClick={onSchedule}>
              <SendIcon className="mr-2 h-4 w-4" />
              {t("list.scheduleFirst")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {renderSection(t("list.needsAttention"), <AlertTriangleIcon className="h-4 w-4" />, needsAttention, "danger")}
          {renderSection(t("list.upcoming"), <SendIcon className="h-4 w-4" />, upcomingItems)}
          {renderSection(t("list.history"), <CheckCircle2Icon className="h-4 w-4" />, visibleHistoryItems)}
          {hasMoreHistory && (
            <div className="flex justify-center pt-1">
              <Button variant="outline" onClick={() => setVisibleHistory((c) => c + PAGE_SIZE)}>
                {t("list.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("list.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("list.cancelConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("list.keepIt")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {t("list.cancelFollowup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
