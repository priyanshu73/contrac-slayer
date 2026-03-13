"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CopyIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export const WEEKDAYS = [
  { key: "sunday", short: "S", label: "Sunday" },
  { key: "monday", short: "M", label: "Monday" },
  { key: "tuesday", short: "T", label: "Tuesday" },
  { key: "wednesday", short: "W", label: "Wednesday" },
  { key: "thursday", short: "Th", label: "Thursday" },
  { key: "friday", short: "F", label: "Friday" },
  { key: "saturday", short: "S", label: "Saturday" },
] as const
export type WeekdayKey = (typeof WEEKDAYS)[number]["key"]

export type TimeRange = { start: string; end: string }
export type WeeklyHours = Record<WeekdayKey, TimeRange[]>

export function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function minutesToHHMM(m: number) {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${pad2(hh)}:${pad2(mm)}`
}

export function hhmmToMinutes(hhmm: string): number {
  const m = String(hhmm || "").trim().match(/^(\d{2}):(\d{2})$/)
  if (!m) return 0
  const hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return hh * 60 + mm
}

export function hhmmToLabel(hhmm: string): string {
  const mins = hhmmToMinutes(hhmm)
  const hh24 = Math.floor(mins / 60)
  const mm = mins % 60
  const ap = hh24 >= 12 ? "PM" : "AM"
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12
  return `${hh12}:${pad2(mm)} ${ap}`
}

export function parseSlotStartToHHMM(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null
  const s = raw.trim()
  const match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/) || s.match(/T(\d{1,2}):(\d{2})/)
  if (match) {
    const hh = parseInt(match[1], 10)
    const mm = parseInt(match[2], 10)
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return `${pad2(hh)}:${pad2(mm)}`
  }
  return null
}

interface AvailabilityTabProps {
  onAvailabilityChanged?: () => void
}

export function AvailabilityTab({ onAvailabilityChanged }: AvailabilityTabProps) {
  const { toast } = useToast()
  
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [hasLoadedAvailability, setHasLoadedAvailability] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)
  
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => ({
    sunday: [],
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "17:00" }],
    thursday: [{ start: "09:00", end: "17:00" }],
    friday: [{ start: "09:00", end: "17:00" }],
    saturday: [],
  }))
  
  const [quickDays, setQuickDays] = useState<Record<WeekdayKey, boolean>>(() => ({
    sunday: false,
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
  }))
  const [quickStart, setQuickStart] = useState("09:00")
  const [quickEnd, setQuickEnd] = useState("17:00")

  const browserTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const [timeZone, setTimeZone] = useState<string>(() => browserTz || "America/New_York")

  const timeOptions = useMemo(() => {
    const step = 30 // minutes
    const opts: Array<{ value: string; label: string }> = []
    for (let m = 0; m < 24 * 60; m += step) {
      const v = minutesToHHMM(m)
      opts.push({ value: v, label: hhmmToLabel(v) })
    }
    return opts
  }, [])

  const timeZoneOptions = useMemo(() => {
    const base = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Toronto",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Kathmandu",
      "Asia/Macau",
      "Asia/Tokyo",
      "Australia/Sydney",
    ]
    const set = new Set(base)
    const extra: string[] = []
    if (timeZone && !set.has(timeZone)) extra.push(timeZone)
    if (browserTz && !set.has(browserTz)) extra.push(browserTz)
    return [...extra, ...base]
  }, [browserTz, timeZone])

  const refreshSingleAvailability = useCallback(async () => {
    try {
      setAvailabilityLoading(true)
      const res = await api.getAvailabilities()
      const data = res?.availabilities
      
      const newWh: WeeklyHours = {
        sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [],
      }
      
      let foundTz = ""
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((item: any) => {
          const dayKey = WEEKDAYS.find(w => w.key === ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][item.day_of_week])?.key
          if (dayKey) {
            newWh[dayKey].push({
              start: parseSlotStartToHHMM(item.start_time) || "09:00",
              end: parseSlotStartToHHMM(item.end_time) || "17:00",
            })
          }
          if (!foundTz && item.timezone) foundTz = item.timezone
        })
      }
      
      setWeeklyHours(newWh)
      if (foundTz) setTimeZone(foundTz)

      setQuickDays((prev) => {
        const out = { ...prev } as Record<WeekdayKey, boolean>
        for (const k of Object.keys(out) as WeekdayKey[]) {
          out[k] = (newWh[k] || []).length > 0
        }
        return out
      })

      const activeDays = (Object.keys(newWh) as WeekdayKey[]).filter(k => (newWh[k] || []).length === 1)
      if (activeDays.length > 0) {
        const ref = newWh[activeDays[0]][0]
        const allSame = activeDays.every(k => newWh[k][0].start === ref.start && newWh[k][0].end === ref.end)
        if (allSame) {
          setQuickStart(ref.start)
          setQuickEnd(ref.end)
        }
      }
    } catch (err: any) {
      toast({ description: "Failed to load availability. You can still set it manually.", variant: "destructive" })
    } finally {
      setAvailabilityLoading(false)
      setHasLoadedAvailability(true)
    }
  }, [toast])

  useEffect(() => {
    if (!hasLoadedAvailability) {
      refreshSingleAvailability()
    }
  }, [hasLoadedAvailability, refreshSingleAvailability])

  const onSaveAvailability = async () => {
    try {
      setSavingAvailability(true)
      
      const payload: any[] = []
      WEEKDAYS.forEach((d, idx) => {
        const ranges = weeklyHours[d.key] || []
        ranges.forEach(r => {
          payload.push({
            day_of_week: idx,
            start_time: r.start,
            end_time: r.end,
            timezone: timeZone
          })
        })
      })

      await api.saveAvailabilities({ availabilities: payload })
      
      toast({ title: "Saved!", description: "Your weekly hours have been updated." })
      await refreshSingleAvailability()
      
      if (onAvailabilityChanged) onAvailabilityChanged()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save hours", variant: "destructive" })
    } finally {
      setSavingAvailability(false)
    }
  }

  const applyUniformToSelectedDays = () => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      for (const d of WEEKDAYS.map((x) => x.key)) {
        if (quickDays[d]) {
          next[d] = [{ start: quickStart, end: quickEnd }]
        } else {
          next[d] = []
        }
      }
      return next
    })
    toast({ description: "Applied uniform hours (not saved yet)." })
  }

  const addRangeForDay = (day: WeekdayKey) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      const existing = next[day] || []
      const last = existing[existing.length - 1]
      next[day] = [...existing, { start: last?.start || quickStart, end: last?.end || quickEnd }]
      return next
    })
  }

  const removeRangeForDay = (day: WeekdayKey, idx: number) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      next[day] = (next[day] || []).filter((_, i) => i !== idx)
      return next
    })
  }

  const updateRangeForDay = (day: WeekdayKey, idx: number, field: "start" | "end", value: string) => {
    setWeeklyHours((prev) => {
      const next = { ...prev }
      next[day] = (next[day] || []).map((r, i) => (i === idx ? { ...r, [field]: value } : r))
      return next
    })
  }

  if (availabilityLoading && !hasLoadedAvailability) {
    return (
      <Card className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card p-4 sm:p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)] max-w-3xl w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6">
          <div className="rounded-2xl border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-10 w-20" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-full" />
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className={cn("p-4 md:p-5", idx > 0 ? "border-t" : "")}>
                <div className="flex items-start gap-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-[160px]" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-10 w-[160px]" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Skeleton className="h-4 w-64" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] relative flex flex-col pt-4 sm:pt-6 md:pt-8 w-full max-w-3xl">
      <div className="px-4 sm:px-6 md:px-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Weekly hours</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set when you’re typically available for meetings</p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-5 px-4 sm:px-6 md:px-8 pb-4">
        <div className="rounded-xl bg-gray-50/80 dark:bg-muted/10 p-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground">Quick apply</h3>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setQuickDays((prev) => ({ ...prev, [d.key]: !prev[d.key] }))}
                  className={cn(
                    "flex items-center justify-center h-8 px-3 rounded-md text-xs font-semibold transition-all",
                    quickDays[d.key] ? "bg-primary text-primary-foreground shadow-sm" : "border border-[#E5E7EB] dark:border-border bg-background hover:bg-muted/60"
                  )}
                  title={d.label}
                >
                  {d.short}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start</label>
                  <Select
                    value={quickStart}
                    onValueChange={(v) => {
                      setQuickStart(v)
                      if (hhmmToMinutes(quickEnd) < hhmmToMinutes(v)) setQuickEnd(v)
                    }}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[105px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">End</label>
                  <Select
                    value={quickEnd}
                    onValueChange={(v) => {
                      setQuickEnd(v)
                      if (hhmmToMinutes(v) < hhmmToMinutes(quickStart)) setQuickStart(v)
                    }}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[105px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 sm:ml-2">
                <label className="text-xs font-medium text-muted-foreground">Time zone</label>
                <div className="flex gap-2 min-w-0">
                  <Select
                    value={timeZone}
                    onValueChange={(v) => {
                      setTimeZone(v)
                    }}
                  >
                    <SelectTrigger className="h-9 flex-1 min-w-0 sm:w-[200px]">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZoneOptions.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" className="rounded-lg shrink-0 h-9 bg-primary text-primary-foreground" onClick={applyUniformToSelectedDays}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden mb-2">
          {WEEKDAYS.map((d, idx) => {
            const ranges = weeklyHours[d.key] || []
            const isUnavailable = ranges.length === 0
            return (
              <div
                key={d.key}
                className={cn(
                  "py-3 px-5 transition-colors hover:bg-gray-50 dark:hover:bg-muted/10",
                  idx > 0 ? "border-t border-[#E2E8F0] dark:border-border" : ""
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
                  <div className="flex items-center gap-3 w-full sm:w-[120px] shrink-0">
                    <Switch
                      checked={!isUnavailable}
                      onCheckedChange={(c) => {
                        if (c) {
                          addRangeForDay(d.key)
                        } else {
                          setWeeklyHours((prev) => ({ ...prev, [d.key]: [] }))
                        }
                      }}
                    />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isUnavailable ? "text-muted-foreground" : "text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {d.label}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex items-center justify-end sm:justify-start">
                    {isUnavailable ? (
                      <button
                        type="button"
                        onClick={() => addRangeForDay(d.key)}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors text-right sm:text-left w-full sm:w-auto"
                      >
                        Add hours
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        {ranges.map((r, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Select
                              value={r.start}
                              onValueChange={(v) => {
                                updateRangeForDay(d.key, i, "start", v)
                                if (hhmmToMinutes(r.end) < hhmmToMinutes(v)) updateRangeForDay(d.key, i, "end", v)
                              }}
                            >
                              <SelectTrigger className="h-9 w-[105px] text-sm font-medium bg-transparent border-[#E2E8F0] dark:border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground/60 text-xs">–</span>
                            <Select
                              value={r.end}
                              onValueChange={(v) => {
                                updateRangeForDay(d.key, i, "end", v)
                                if (hhmmToMinutes(v) < hhmmToMinutes(r.start)) updateRangeForDay(d.key, i, "start", v)
                              }}
                            >
                              <SelectTrigger className="h-9 w-[105px] text-sm font-medium bg-transparent border-[#E2E8F0] dark:border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-0.5 border border-gray-200 dark:border-border rounded-lg p-0.5 sm:ml-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeRangeForDay(d.key, i)}
                                aria-label={`Remove time range from ${d.label}`}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                              
                              {i === 0 && ranges.length === 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                  onClick={() => addRangeForDay(d.key)}
                                  aria-label={`Add another time range for ${d.label}`}
                                >
                                  <PlusIcon className="h-4 w-4 stroke-[2]" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      <div className="sticky bottom-0 mt-auto border-t border-[#E2E8F0] dark:border-border bg-card/95 backdrop-blur px-4 sm:px-6 md:px-8 py-4 flex items-center justify-end gap-3 z-10 rounded-b-xl">
        <Button type="button" variant="outline" className="rounded-lg" onClick={refreshSingleAvailability} disabled={availabilityLoading}>
          Reload
        </Button>
        <Button type="button" className="rounded-lg bg-primary text-primary-foreground shadow-sm" onClick={onSaveAvailability} disabled={savingAvailability || availabilityLoading}>
          {savingAvailability ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  )
}
