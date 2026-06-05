"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
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
import {
  CalendarIcon,
  ClockIcon,
  MailIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  Loader2Icon,
  InfoIcon,
  Link2Icon,
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
import type { ScheduledFollowup, FollowupStatus, FollowupType } from "@/lib/types/followup"
import { contractorAI, api } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"

/**
 * Pull URLs out of a message and label them by what they link to, so the preview
 * can render compact chips (e.g. "View Proposal →") instead of long raw links.
 * Mirrors the link-chip pattern used in the leads conversation view.
 */
function extractUrls(text: string): {
  cleanText: string
  urls: Array<{ href: string; label: string }>
} {
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

/** Normalize phone to E.164 (+1XXXXXXXXXX) for lookup against ContractorBackend response. */
function normalizePhoneToE164(phone: string): string {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return phone
}

export interface FollowupStats {
  total: number
  pending: number
  sent: number
  failed: number
}

interface ScheduledFollowupsListProps {
  contractorId?: number
  /** Bump to force a refetch (e.g. after scheduling a new follow-up). */
  refreshKey?: number
  /** Reports stats for the full (unfiltered) set so a parent can render them. */
  onStatsChange?: (stats: FollowupStats) => void
}

const followupTypeIcons: Record<FollowupType, React.ReactNode> = {
  appointment_1day: <CalendarIcon className="h-4 w-4" />,
  appointment_1hour: <ClockIcon className="h-4 w-4" />,
  quote: <FileTextIcon className="h-4 w-4" />,
  custom: <MailIcon className="h-4 w-4" />,
}

function getFollowupTypeLabels(t: (key: string) => string): Record<FollowupType, string> {
  return {
    appointment_1day: t("list.typeAppointment1day"),
    appointment_1hour: t("list.typeAppointment1hour"),
    quote: t("list.typeQuote"),
    custom: t("list.typeCustom"),
  }
}

const statusColors: Record<FollowupStatus, string> = {
  pending: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  sent: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  failed: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
}

/** Status pills shown in the Activity panel header. */
const STATUS_PILLS: Array<FollowupStatus | "all"> = ["all", "pending", "sent"]

/** How many activity items to render per "page" before requiring "Load More". */
const PAGE_SIZE = 10

export function ScheduledFollowupsList({
  contractorId,
  refreshKey = 0,
  onStatsChange,
}: ScheduledFollowupsListProps) {
  const t = useTranslations("scheduling")
  const [followups, setFollowups] = useState<ScheduledFollowup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [spNotFound, setSpNotFound] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FollowupType | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<FollowupStatus | "all">("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [followupToDelete, setFollowupToDelete] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { toast } = useToast()
  const followupTypeLabels = getFollowupTypeLabels((key) => t(key))

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

  useEffect(() => {
    const fetchFollowups = async () => {
      if (!contractorId) {
        setIsLoading(false)
        setSpNotFound(false)
        setFollowups([])
        reportStats([])
        return
      }

      try {
        setIsLoading(true)
        setSpNotFound(false)
        // Fetch the full set (no server-side status/type filter) so the stats and
        // pills stay stable; all filtering happens client-side below.
        const data = await contractorAI.getScheduledFollowups(contractorId.toString()) as
          { followups?: ScheduledFollowup[] } | ScheduledFollowup[]
        const raw = (Array.isArray(data) ? data : data.followups || []) as ScheduledFollowup[]
        const phones = [...new Set(raw.map((f) => f.customer_number).filter(Boolean))]
        let phoneToName: Record<string, string> = {}
        try {
          phoneToName = await api.getCustomerNamesByPhones(phones)
        } catch {
          // User may not be logged into ContractorBackend; show followups without names
        }
        const merged = raw.map((f) => ({
          ...f,
          customer_name: phoneToName[normalizePhoneToE164(f.customer_number)] ?? f.customer_name ?? "",
        }))
        setFollowups(merged)
        reportStats(merged)
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.toLowerCase().includes("service provider not found")) {
          setFollowups([])
          reportStats([])
          setSpNotFound(true)
        } else {
          toast({
            title: t("list.loadFailed").replace(/\..*/, "").trim() || "Error",
            description: message || t("list.loadFailed"),
            variant: "destructive",
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchFollowups()
  }, [contractorId, refreshKey, reportStats, toast])

  const filteredFollowups = followups.filter((followup) => {
    if (selectedStatus !== "all" && followup.status !== selectedStatus) return false
    if (typeFilter !== "all" && followup.followup_type !== typeFilter) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        followup.customer_name.toLowerCase().includes(query) ||
        followup.message_text.toLowerCase().includes(query) ||
        followup.customer_number.includes(query)
      )
    }

    return true
  })

  // Reset pagination whenever the filtered set changes (new filter, search, or data).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, typeFilter, selectedStatus, followups])

  const visibleFollowups = filteredFollowups.slice(0, visibleCount)
  const hasMore = filteredFollowups.length > visibleCount

  const handleDeleteClick = (followupId: number) => {
    setFollowupToDelete(followupId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!followupToDelete) return

    try {
      await contractorAI.cancelFollowup(followupToDelete.toString())
      setFollowups((prev) => {
        const next = prev.filter((f) => f.id !== followupToDelete)
        reportStats(next)
        return next
      })
      toast({
        title: t("list.cancelConfirmTitle"),
        description: t("list.cancelledSuccess"),
      })
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

  const getRelativeTime = (dateString: string) => {
    try {
      const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
      const date = new Date(utcString)
      const now = new Date()
      const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60))

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
      const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
      const date = new Date(utcString)
      return format(date, "MMM d, h:mm a")
    } catch {
      return dateString
    }
  }

  const pillLabel = (status: FollowupStatus | "all") =>
    status === "all" ? t("list.filterAll") : t(`list.${status}` as "list.pending" | "list.sent")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contractorId || spNotFound) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          {spNotFound ? t("list.spNotFound") : t("list.spRequired")}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + type filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("list.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FollowupType | "all")}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <FilterIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder={t("list.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.allTypes")}</SelectItem>
            <SelectItem value="appointment_1day">{t("list.typeAppointment1day")}</SelectItem>
            <SelectItem value="appointment_1hour">{t("list.typeAppointment1hour")}</SelectItem>
            <SelectItem value="quote">{t("list.typeQuote")}</SelectItem>
            <SelectItem value="custom">{t("list.typeCustom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              selectedStatus === status
                ? "border-transparent bg-foreground text-background"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {pillLabel(status)}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      {filteredFollowups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MailIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{t("list.noFollowups")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || typeFilter !== "all" || selectedStatus !== "all"
              ? t("list.tryFilters")
              : t("list.getStarted")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleFollowups.map((followup) => (
            <div key={followup.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {followupTypeIcons[followup.followup_type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {followup.customer_name || formatPhoneForDisplay(followup.customer_number) || "—"}
                      </span>
                    </div>
                    {(() => {
                      const { cleanText, urls } = extractUrls(followup.message_text)
                      return (
                        <>
                          {cleanText && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {cleanText}
                            </p>
                          )}
                          {urls.length > 0 && (
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
                            </div>
                          )}
                        </>
                      )
                    })()}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatShortDate(followup.scheduled_for)} · {getRelativeTime(followup.scheduled_for)}
                      {followup.followup_type !== "custom" && (
                        <> · {followupTypeLabels[followup.followup_type]}</>
                      )}
                    </p>
                    {followup.status === "failed" && followup.error_message && (
                      <p className="mt-1 text-xs text-red-500">{followup.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(followup.id)}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          {t("list.cancelFollowup")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                {t("list.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
