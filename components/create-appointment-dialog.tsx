"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Calendar, ChevronsUpDown, Video, Building2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Kbd } from "@/components/ui/kbd"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { AddClientForm, type CreatedClient } from "@/components/add-client-form"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { AddressData } from "@/lib/types/address"


function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" className={cn("shrink-0", className)} fill="currentColor" aria-hidden>
      <path d="M720-400v-120H600v-80h120v-120h80v120h120v80H800v120h-80Zm-360-80q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm80-80h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0-80Zm0 400Z" />
    </svg>
  )
}

function pad2(n: number) {
  return String(n).padStart(2, "0")
}
function minutesToHHMM(m: number) {
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return `${pad2(hh)}:${pad2(mm)}`
}
function hhmmToMinutes(hhmm: string): number {
  const m = String(hhmm || "").trim().match(/^(\d{2}):(\d{2})$/)
  if (!m) return 0
  const hh = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return hh * 60 + mm
}
function hhmmToLabel(hhmm: string): string {
  const mins = hhmmToMinutes(hhmm)
  const hh24 = Math.floor(mins / 60)
  const mm = mins % 60
  const ap = hh24 >= 12 ? "PM" : "AM"
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12
  return `${hh12}:${pad2(mm)} ${ap}`
}
function hhmmToApiTime(hhmm: string): string {
  const mins = hhmmToMinutes(hhmm)
  const hh24 = Math.floor(mins / 60)
  const mm = mins % 60
  const ap = hh24 >= 12 ? "PM" : "AM"
  const hh12raw = hh24 % 12 === 0 ? 12 : hh24 % 12
  return `${pad2(hh12raw)}:${pad2(mm)} ${ap}`
}

/** Parse a slot time string (e.g. "09:00", "09:00:00", or ISO datetime) to HH:MM. */
function parseSlotStartToHHMM(raw: string): string | null {
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

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
] as const

function getAvatarColor(clientId: number): string {
  return AVATAR_COLORS[Math.abs(clientId) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name || "?").slice(0, 2).toUpperCase()
}

// Simplified: only Google Meet (virtual) or In-person
type MeetingSpot = "google_meet" | "in_person"

export type CreateAppointmentClient = { id: number; name: string; email: string; address?: string }

export interface CreateAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: CreateAppointmentClient[]
  profile: { time_zone?: string; calendar_link?: string } | null
  preSelectedClientId?: string | null
  onSuccess?: () => void
  /** Called when a new client is created from the "Add client" panel; use to refetch clients. */
  onClientCreated?: (client: CreateAppointmentClient) => void
}
export function CreateAppointmentDialog({
  open,
  onOpenChange,
  clients,
  profile,
  preSelectedClientId = null,
  onSuccess,
  onClientCreated,
}: CreateAppointmentDialogProps) {
  const { toast } = useToast()
  const tCalendar = useTranslations("calendar")
  const tCommon = useTranslations("common")

  const [clientId, setClientId] = useState<string>("")
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [addClientPanelOpen, setAddClientPanelOpen] = useState(false)
  const [date, setDate] = useState<string>("")
  const [time, setTime] = useState<string>("")
  const [meetingSpot, setMeetingSpot] = useState<MeetingSpot>("google_meet")
  const [location, setLocation] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [slotTimeOptions, setSlotTimeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  useEffect(() => {
    if (open && preSelectedClientId) {
      setClientId(preSelectedClientId)
    }
  }, [open, preSelectedClientId])

  const hasCalendarLink = Boolean(profile?.calendar_link)
  const timeZoneToUse = profile?.time_zone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null) ?? "America/New_York"
  
  useEffect(() => {
    if (!open) setAddClientPanelOpen(false)
  }, [open])

  useEffect(() => {
    if (!open || !date.trim() || !hasCalendarLink) {
      setSlotTimeOptions([])
      return
    }
    const [y, m, d] = date.split("-").map(Number)
    if (!y || !m) return
    setSlotsLoading(true)
    api
      .getAvailableSlots({
        date,
        timezone: timeZoneToUse,
      })
      .then((res: any) => {
        const startTimes = new Set<string>()
        const rawSlots = Array.isArray(res?.slots) ? res.slots : []
        for (const slot of rawSlots as Array<string>) {
          const hhmm = parseSlotStartToHHMM(slot)
          if (hhmm) startTimes.add(hhmm)
        }
        const sorted = Array.from(startTimes).sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b))
        setSlotTimeOptions(sorted.map((v) => ({ value: v, label: hhmmToLabel(v) })))
      })
      .catch(() => setSlotTimeOptions([]))
      .finally(() => setSlotsLoading(false))
  }, [open, date, hasCalendarLink, timeZoneToUse])

  useEffect(() => {
    if (slotTimeOptions.length === 0) {
      setTime("")
      return
    }
    const currentInList = slotTimeOptions.some((o) => o.value === time)
    if (!currentInList) setTime(slotTimeOptions[0].value)
  }, [slotTimeOptions])

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === clientId),
    [clients, clientId]
  )

  // When switching to in-person and selected client has address, pre-fill it
  useEffect(() => {
    if (meetingSpot === "in_person" && selectedClient?.address?.trim()) {
      setLocation(selectedClient.address.trim())
    }
    if (meetingSpot === "google_meet") {
      setLocation("")
    }
  }, [meetingSpot, selectedClient?.id, selectedClient?.address])

  const onSubmit = useCallback(async () => {
    const client = clients.find((c) => String(c.id) === clientId)
    if (!client?.email) {
      toast({ description: tCalendar("selectClient"), variant: "destructive" as any })
      return
    }
    if (!date.trim()) {
      toast({ description: tCalendar("selectDate"), variant: "destructive" as any })
      return
    }
    if (!time) {
      toast({ description: "Please select an available time.", variant: "destructive" as any })
      return
    }
    setCreating(true)
    try {
      const timeZoneToUse = profile?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
      const isInPerson = meetingSpot === "in_person"
      const locationTrimmed = location?.trim() ?? ""
      await api.createBooking({
        client_name: client.name,
        client_email: client.email,
        time_zone: timeZoneToUse,
        slot_date: date,
        slot_start_time: hhmmToApiTime(time),
        preferred_meeting_spot: isInPerson ? "physical" : "virtual",
        ...(isInPerson && locationTrimmed ? { location: locationTrimmed } : {}),
      })
      toast({ description: tCalendar("appointmentCreated") })
      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      toast({ description: e?.message || "Failed to create appointment", variant: "destructive" as any })
    } finally {
      setCreating(false)
    }
  }, [clientId, clients, date, location, meetingSpot, profile?.time_zone, time, tCalendar, onOpenChange, onSuccess, toast])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (hasCalendarLink && !creating) onSubmit()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, hasCalendarLink, creating, onSubmit])

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-2xl border shadow-xl",
          "bg-gradient-to-b from-background to-muted/5",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        )}
        showCloseButton={true}
      >
        {/* Header accent + title */}
        <div className="relative">
          <div className="h-1 w-full rounded-t-2xl bg-primary/80" aria-hidden />
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {tCalendar("createAppointment")}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tCalendar("createAppointmentDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Client — searchable combobox */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground block">
                {tCalendar("selectClient")}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    onClick={() => setAddClientPanelOpen(true)}
                    aria-label={tCalendar("addClient")}
                  >
                    <PersonAddIcon className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  {tCalendar("addClientTooltip")}
                </TooltipContent>
              </Tooltip>
            </div>
            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboboxOpen}
                  disabled={!hasCalendarLink}
                  className={cn(
                    "h-11 w-full justify-between rounded-lg px-3 py-2.5 font-normal",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    !selectedClient && "text-muted-foreground"
                  )}
                >
                  {selectedClient ? (
                    <div className="flex items-center gap-3 truncate text-left">
                      <Avatar
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-full",
                          getAvatarColor(selectedClient.id)
                        )}
                      >
                        <AvatarFallback className="text-sm font-medium">
                          {getInitials(selectedClient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-[15px] font-medium text-foreground">
                          {selectedClient.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {selectedClient.email}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span>{tCalendar("selectClientPlaceholder")}</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder={tCalendar("selectClientPlaceholder")} className="h-10" />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.email}`}
                          onSelect={() => {
                            setClientId(String(c.id))
                            setClientComboboxOpen(false)
                          }}
                          className="gap-3 py-2.5 data-[selected=true]:bg-muted/70 data-[selected=true]:text-foreground"
                        >
                          <Avatar
                            className={cn(
                              "h-9 w-9 shrink-0 rounded-full",
                              getAvatarColor(c.id)
                            )}
                          >
                            <AvatarFallback className="text-sm font-medium">
                              {getInitials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-foreground">
                              {c.name}
                            </span>
                            <span className="block text-sm text-muted-foreground">{c.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date & Time — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">{tCalendar("date")}</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!hasCalendarLink}
                className="h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">{tCalendar("time")}</label>
              <Select
                value={time || undefined}
                onValueChange={setTime}
                disabled={!hasCalendarLink || slotsLoading || !date.trim()}
              >
                <SelectTrigger className="h-11 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>span]:line-clamp-1">
                  <SelectValue
                    placeholder={
                      !date.trim()
                        ? "Select date first"
                        : slotsLoading
                          ? "Loading..."
                          : slotTimeOptions.length === 0
                            ? "No available slots"
                            : undefined
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {slotTimeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Type — simplified to Google Meet or In-person */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">
              {tCalendar("meetingType")}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              {(
                [
                  { value: "google_meet", label: "Google Meet", Icon: Video },
                  { value: "in_person", label: "In-person", Icon: Building2 },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={!hasCalendarLink}
                  onClick={() => setMeetingSpot(value)}
                  aria-pressed={meetingSpot === value}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    meetingSpot === value
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    !hasCalendarLink && "opacity-50 pointer-events-none"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* In-person: Mapbox address autocomplete */}
            {meetingSpot === "in_person" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <MapboxAddressInput
                  label={tCalendar("location")}
                  placeholder={tCalendar("locationPlaceholder")}
                  defaultValue={location}
                  id="appointment-location"
                  onAddressSelect={(addressData: AddressData | null) => {
                    setLocation(addressData?.formatted_address ?? "")
                  }}
                />
              </div>
            )}

            {/* Google Meet: informational note */}
            {meetingSpot === "google_meet" && (
              <p className="text-xs text-muted-foreground animate-in fade-in duration-200">
                A Google Meet link will be automatically generated and added to the calendar invite.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              className="w-full sm:min-w-[140px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={onSubmit}
              disabled={creating || !hasCalendarLink}
            >
              {creating ? "Saving..." : tCalendar("createAppointment")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            <Kbd className="align-middle">⌘</Kbd>
            <span className="mx-0.5">+</span>
            <Kbd className="align-middle">⏎</Kbd>
            <span className="ml-1">{tCalendar("keyboardHintCreate")}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>

    <Sheet open={addClientPanelOpen} onOpenChange={setAddClientPanelOpen}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tCalendar("addClient")}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {tCalendar("addClientTooltip")}
          </p>
        </SheetHeader>
        <div className="mt-4 px-1">
          <AddClientForm
            embedded
            onSuccess={(newClient: CreatedClient) => {
              setClientId(String(newClient.id))
              setAddClientPanelOpen(false)
              onClientCreated?.({ id: newClient.id, name: newClient.name, email: newClient.email })
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
