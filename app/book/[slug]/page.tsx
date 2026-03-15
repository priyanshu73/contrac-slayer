"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  format,
  addDays,
  startOfToday,
  isSameDay,
  isBefore,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
} from "date-fns"
import {
  Calendar,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Video,
  Building2,
  AlertCircle,
  Globe,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import type { AddressData } from "@/lib/types/address"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

type Step = "date" | "details" | "success"

type PublicContractor = {
  id: number
  name?: string
  company_name: string
  email?: string | null
  phone_number?: string | null
  logo_url?: string | null
  website_url?: string | null
  address?: string | null
  time_zone: string
}

interface Slot {
  iso: string
  label: string
  value: string
}

function isoToSlot(iso: string, tz: string): Slot {
  const dt = new Date(iso)
  const label = dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })
  const value = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })
  return { iso, label, value }
}

export default function PublicBookPage() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const clientTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const [step, setStep] = useState<Step>("date")
  const [profileLoading, setProfileLoading] = useState(true)
  const [profile, setProfile] = useState<PublicContractor | null>(null)
  const [profileError, setProfileError] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(startOfToday())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [meetingType, setMeetingType] = useState<"virtual" | "physical">("virtual")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/contractors/public/slug/${slug}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => setProfile({
        id: data.id,
        name: data.name,
        company_name: data.company_name || "Contractor",
        email: data.email,
        phone_number: data.phone_number,
        logo_url: data.logo_url,
        website_url: data.website_url,
        address: data.address,
        time_zone: data.time_zone || clientTz,
      }))
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false))
  }, [slug, clientTz])

  const fetchSlots = useCallback(async (date: Date) => {
    if (!profile?.id) return
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const r = await fetch(
        `${API_URL}/calendar/public/slots?date=${dateStr}&timezone=${encodeURIComponent(clientTz)}&contractor_id=${profile.id}`
      )
      if (!r.ok) throw new Error()
      const data = await r.json()
      setSlots((data.slots || []).map((iso: string) => isoToSlot(iso, clientTz)))
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [profile?.id, clientTz])

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate)
  }, [selectedDate, fetchSlots])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })
    const leadingBlanks = getDay(start) // 0=Sun
    return { days, leadingBlanks }
  }, [currentMonth])

  const handleBook = async () => {
    if (!name.trim()) { toast({ description: "Name is required.", variant: "destructive" }); return }
    if (!selectedSlot || !profile || !selectedDate) { toast({ description: "Please select a time slot.", variant: "destructive" }); return }
    setSubmitting(true)
    try {
      const r = await fetch(`${API_URL}/calendar/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: profile.id,
          client_name: name.trim(),
          client_email: email.trim() || undefined,
          client_phone: phone.trim() || undefined,
          time_zone: clientTz,
          slot_date: format(selectedDate, "yyyy-MM-dd"),
          slot_start_time: selectedSlot.value,
          preferred_meeting_spot: meetingType,
          location: meetingType === "physical" ? location.trim() || undefined : undefined,
          description: notes.trim() || undefined,
        }),
      })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.detail || "Booking failed") }
      setStep("success")
    } catch (err: any) {
      toast({ title: "Booking failed", description: err?.message || "Booking failed", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const formatSlotLabel = (slot: Slot) => {
    if (timeFormat === "24h") {
      return slot.value
    }
    return slot.label
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[280px_1fr_320px] divide-x divide-gray-200 min-h-[600px]">
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="p-8"><Skeleton className="h-full w-full rounded-xl" /></div>
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Link not found</h1>
          <p className="text-gray-500 text-sm">This scheduling link doesn't exist or has been deactivated.</p>
        </div>
      </div>
    )
  }

  const today = startOfToday()
  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {step === "success" ? (
            /* ── SUCCESS ── */
            <div className="flex flex-col items-center justify-center text-center gap-5 py-20 px-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">You're booked!</h2>
                <p className="mt-1.5 text-gray-500 text-sm max-w-xs mx-auto">
                  {email ? "A confirmation has been sent to your email." : "Your meeting has been scheduled."}
                </p>
              </div>
              <div className="mt-1 w-full max-w-xs bg-gray-50 border border-gray-100 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}</p>
                    <p className="text-blue-600 font-bold text-lg leading-tight">{selectedSlot?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  {meetingType === "virtual"
                    ? <><Video className="w-4 h-4 text-gray-400 shrink-0" /> Google Meet link will be provided</>
                    : <><MapPin className="w-4 h-4 text-gray-400 shrink-0" /> {location || "In-person"}</>}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => { setStep("date"); setSelectedSlot(null); setSelectedDate(null); setName(""); setEmail(""); setPhone(""); setLocation(""); setNotes("") }}
                className="mt-1 rounded-xl border-gray-200 text-gray-700"
              >
                Book another time
              </Button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:divide-x lg:divide-gray-100 min-h-[600px]">

              {/* ── LEFT SIDEBAR ── */}
              <aside className="w-full lg:w-[260px] shrink-0 p-7 flex flex-col gap-5 border-b lg:border-b-0 border-gray-100">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={`${profile.company_name} logo`}
                    className="h-12 w-12 rounded-xl border border-gray-200 object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-400 mb-0.5">{profile.company_name}</p>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">30 Min Meeting</h1>
                </div>

                <div className="flex flex-col gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>30 minutes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Video className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Video call</span>
                  </div>
                  {profile.phone_number && (
                    <a href={`tel:${profile.phone_number}`} className="flex items-center gap-2.5 hover:text-gray-900 transition-colors">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{profile.phone_number}</span>
                    </a>
                  )}
                  {profile.email && (
                    <a href={`mailto:${profile.email}`} className="flex items-center gap-2.5 hover:text-gray-900 transition-colors">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{profile.email}</span>
                    </a>
                  )}
                  {profile.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-line">{profile.address}</span>
                    </div>
                  )}
                  {profile.website_url && (
                    <a href={profile.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-gray-900 transition-colors">
                      <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{profile.website_url.replace(/^https?:\/\//, "")}</span>
                    </a>
                  )}
                </div>

                {selectedDate && selectedSlot && (
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mb-1">Selected</p>
                    <p className="text-sm font-semibold text-gray-800">{format(selectedDate, "EEE, MMM d")}</p>
                    <p className="text-sm text-blue-600 font-medium">{selectedSlot.label}</p>
                  </div>
                )}
              </aside>

              {/* ── CENTER: CALENDAR ── */}
              {step === "date" && (
                <div className="flex-1 min-w-0 p-7">
                  {/* Month header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">
                      <span>{format(currentMonth, "MMMM")}</span>{" "}
                      <span className="text-gray-400 font-normal">{format(currentMonth, "yyyy")}</span>
                    </h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                        disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), today)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:pointer-events-none transition"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Day labels */}
                  <div className="grid grid-cols-7 mb-2">
                    {DAYS_OF_WEEK.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Leading blanks */}
                    {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}
                    {/* Days */}
                    {calendarDays.days.map((day) => {
                      const isPast = isBefore(day, today)
                      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                      const isToday = isSameDay(day, today)
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => { if (!isPast) setSelectedDate(day) }}
                          disabled={isPast}
                          aria-pressed={isSelected}
                          aria-label={format(day, "EEEE MMMM d")}
                          className={cn(
                            "relative aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            isPast && "text-gray-200 cursor-not-allowed",
                            !isPast && !isSelected && "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                            isSelected && "bg-blue-600 text-white shadow-md shadow-blue-200",
                            isToday && !isSelected && "ring-1 ring-blue-300 text-blue-600",
                          )}
                        >
                          {format(day, "d")}
                          {isToday && !isSelected && (
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Timezone */}
                  <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{clientTz.replace(/_/g, " ")}</span>
                  </div>
                </div>
              )}

              {/* ── DETAILS FORM ── */}
              {step === "details" && (
                <div className="flex-1 min-w-0 p-7 flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <button
                      onClick={() => setStep("date")}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                      aria-label="Back to date selection"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-semibold text-gray-900">Enter your details</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Full name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                          className="pl-9 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 h-11" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com"
                            className="pl-9 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 h-11" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000"
                            className="pl-9 rounded-xl border-gray-200 focus-visible:ring-blue-500/30 h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Meeting type</Label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                        {(["virtual", "physical"] as const).map((type) => (
                          <button key={type} type="button" onClick={() => setMeetingType(type)}
                            className={cn(
                              "flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                              meetingType === type ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                            )}>
                            {type === "virtual" ? <><Video className="w-3.5 h-3.5" /> Virtual</> : <><Building2 className="w-3.5 h-3.5" /> In-person</>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {meetingType === "physical" && (
                      <div className="space-y-1.5">
                        <MapboxAddressInput label="Your address" placeholder="123 Main St, City, State" id="location"
                          defaultValue={location}
                          onAddressSelect={(d: AddressData | null) => setLocation(d?.formatted_address ?? "")}
                          className="[&_input]:rounded-xl [&_input]:border-gray-200 [&_label]:text-xs [&_label]:font-medium [&_label]:text-gray-500 [&_label]:uppercase [&_label]:tracking-wide" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes (optional)</Label>
                      <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything that will help us prepare…"
                        className="resize-none h-20 rounded-xl border-gray-200 focus-visible:ring-blue-500/30" />
                    </div>
                  </div>

                  <div className="pt-5">
                    <Button onClick={handleBook} disabled={submitting || !name.trim()}
                      className="w-full rounded-xl h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700">
                      {submitting ? "Confirming…" : "Confirm booking"}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── RIGHT: TIME SLOTS ── */}
              {step === "date" && (
                <div className="w-full lg:w-[280px] shrink-0 p-7 flex flex-col border-t lg:border-t-0 border-gray-100">
                  {selectedDate ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{format(selectedDate, "EEE")}{" "}<span className="text-blue-600">{format(selectedDate, "d")}</span></p>
                        </div>
                        <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg">
                          {(["12h", "24h"] as const).map((fmt) => (
                            <button key={fmt} onClick={() => setTimeFormat(fmt)}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                                timeFormat === fmt ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                              )}>
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1">
                        {slotsLoading ? (
                          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)
                        ) : slots.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
                            <Clock className="w-7 h-7 opacity-30" />
                            <p className="text-xs text-center">No times available<br />try another date</p>
                          </div>
                        ) : (
                          slots.map((slot) => (
                            <button
                              key={slot.iso}
                              onClick={() => setSelectedSlot(selectedSlot?.iso === slot.iso ? null : slot)}
                              aria-pressed={selectedSlot?.iso === slot.iso}
                              className={cn(
                                "w-full h-11 rounded-xl text-sm font-medium border transition-all",
                                selectedSlot?.iso === slot.iso
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                                  : "border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                              )}
                            >
                              {formatSlotLabel(slot)}
                            </button>
                          ))
                        )}
                      </div>

                      {selectedSlot && (
                        <div className="pt-4 mt-2 border-t border-gray-100">
                          <Button onClick={() => setStep("details")} className="w-full rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-sm font-semibold">
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                      <Calendar className="w-8 h-8 opacity-40" />
                      <p className="text-xs text-center">Select a date to<br />see available times</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by <span className="font-medium text-gray-500">ContractorOps</span>
        </p>
      </div>
    </div>
  )
}