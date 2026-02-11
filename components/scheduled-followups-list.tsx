"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  DollarSignIcon,
  MoreHorizontalIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  Loader2Icon,
  InfoIcon
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import type { ScheduledFollowup, FollowupStatus, FollowupType } from "@/lib/types/followup"
import { contractorAI, api } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"

/** Normalize phone to E.164 (+1XXXXXXXXXX) for lookup against ContractorBackend response. */
function normalizePhoneToE164(phone: string): string {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return phone
}

interface ScheduledFollowupsListProps {
  contractorId?: number
  statusFilter?: FollowupStatus | "all"
  /** Optional action (e.g. "Schedule Follow-up" button) shown to the right of the filters row */
  headerAction?: React.ReactNode
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

export function ScheduledFollowupsList({ contractorId, statusFilter = "all", headerAction }: ScheduledFollowupsListProps) {
  const t = useTranslations("scheduling")
  const [followups, setFollowups] = useState<ScheduledFollowup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [spNotFound, setSpNotFound] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FollowupType | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<FollowupStatus | "all">(statusFilter)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [followupToDelete, setFollowupToDelete] = useState<number | null>(null)
  const { toast } = useToast()
  const followupTypeLabels = getFollowupTypeLabels((key) => t(key))

  useEffect(() => {
    const fetchFollowups = async () => {
      if (!contractorId) {
        setIsLoading(false)
        setSpNotFound(false)
        return
      }

      try {
        setIsLoading(true)
        setSpNotFound(false)
        const data = await contractorAI.getScheduledFollowups(contractorId.toString(), {
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        })
        const raw = (data.followups || data || []) as ScheduledFollowup[]
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
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.toLowerCase().includes("service provider not found")) {
          setFollowups([])
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
  }, [contractorId, selectedStatus, typeFilter, toast])

  const filteredFollowups = followups.filter(followup => {
    // Status filter
    if (selectedStatus !== "all" && followup.status !== selectedStatus) return false
    
    // Type filter
    if (typeFilter !== "all" && followup.followup_type !== typeFilter) return false
    
    // Search filter
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

  const handleDeleteClick = (followupId: number) => {
    setFollowupToDelete(followupId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!followupToDelete) return
    
    try {
      await contractorAI.cancelFollowup(followupToDelete.toString())
      setFollowups(prev => prev.filter(f => f.id !== followupToDelete))
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

  const formatDateTime = (dateString: string) => {
    try {
      // API returns UTC; ensure we parse as UTC if no timezone suffix
      const utcString = /[Z+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : `${dateString.replace(/Z$/, "")}Z`
      const date = new Date(utcString)
      const timeZoneName = typeof Intl !== "undefined"
        ? new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
            .formatToParts(date)
            .find((p) => p.type === "timeZoneName")?.value ?? ""
        : ""
      const formatted = format(date, "MMM d, yyyy 'at' h:mm a")
      return timeZoneName ? `${formatted} ${timeZoneName}` : formatted
    } catch {
      return dateString
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
      {/* Filters: search, type filter, and optional action (e.g. Schedule Follow-up) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("list.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as FollowupType | "all")}>
            <SelectTrigger className="w-[180px]">
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
          {headerAction}
        </div>
      </div>

      {/* Stats - single compact row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg border px-2 py-2 text-center min-w-0">
          <div className="text-xs text-muted-foreground truncate">{t("list.total")}</div>
          <div className="text-lg font-bold tabular-nums">{followups.length}</div>
        </div>
        <div className="rounded-lg border px-2 py-2 text-center min-w-0">
          <div className="text-xs text-muted-foreground truncate">{t("list.pending")}</div>
          <div className="text-lg font-bold text-blue-500 tabular-nums">
            {followups.filter(f => f.status === "pending").length}
          </div>
        </div>
        <div className="rounded-lg border px-2 py-2 text-center min-w-0">
          <div className="text-xs text-muted-foreground truncate">{t("list.sent")}</div>
          <div className="text-lg font-bold text-green-500 tabular-nums">
            {followups.filter(f => f.status === "sent").length}
          </div>
        </div>
        <div className="rounded-lg border px-2 py-2 text-center min-w-0">
          <div className="text-xs text-muted-foreground truncate">{t("list.failed")}</div>
          <div className="text-lg font-bold text-red-500 tabular-nums">
            {followups.filter(f => f.status === "failed").length}
          </div>
        </div>
      </div>

      {/* Content */}
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
        <>
          {/* Mobile: card list (no horizontal scroll) */}
          <div className="space-y-2 md:hidden">
            {filteredFollowups.map((followup) => (
              <div
                key={followup.id}
                className="rounded-lg border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="shrink-0 text-muted-foreground">
                      {followupTypeIcons[followup.followup_type]}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {followupTypeLabels[followup.followup_type]}
                    </span>
                  </div>
                  <Badge className={`shrink-0 ${statusColors[followup.status]}`} variant="secondary">
                    {t(`list.${followup.status}` as "list.pending" | "list.sent" | "list.failed" | "list.cancelled")}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {followup.customer_name || "—"} · {formatPhoneForDisplay(followup.customer_number)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {followup.message_text}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatShortDate(followup.scheduled_for)} · {getRelativeTime(followup.scheduled_for)}
                  </span>
                  {followup.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive"
                      onClick={() => handleDeleteClick(followup.id)}
                    >
                      <TrashIcon className="mr-1 h-3 w-3" />
                      {t("list.cancelFollowup")}
                    </Button>
                  )}
                </div>
                {followup.status === "failed" && followup.error_message && (
                  <p className="mt-1 text-xs text-red-500">{followup.error_message}</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("list.type")}</TableHead>
                  <TableHead>{t("list.customerName")}</TableHead>
                  <TableHead>{t("list.message")}</TableHead>
                  <TableHead>{t("list.scheduledFor")}</TableHead>
                  <TableHead>{t("list.status")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowups.map((followup) => (
                  <TableRow key={followup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {followupTypeIcons[followup.followup_type]}
                        <span className="text-sm font-medium">
                          {followupTypeLabels[followup.followup_type]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{followup.customer_name || "—"}</div>
                        <div className="text-sm text-muted-foreground">{formatPhoneForDisplay(followup.customer_number)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="text-sm line-clamp-2">{followup.message_text}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">{formatDateTime(followup.scheduled_for)}</div>
                        <div className="text-xs text-muted-foreground">{getRelativeTime(followup.scheduled_for)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[followup.status]} variant="secondary">
                        {t(`list.${followup.status}` as "list.pending" | "list.sent" | "list.failed" | "list.cancelled")}
                      </Badge>
                      {followup.status === "failed" && followup.error_message && (
                        <p className="mt-1 text-xs text-red-500">{followup.error_message}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {followup.status === "pending" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
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
