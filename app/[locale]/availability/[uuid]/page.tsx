"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CalendarClock, Briefcase, MapPin, CheckCircle2 } from "lucide-react"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { AddressData } from "@/lib/types/address"

export default function AvailabilityPortalPage() {
  const params = useParams()
  const t = useTranslations("projects.subPortal") // reusing some translations
  const [subcontractor, setSubcontractor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const uuid = params.uuid as string

  // Form State
  const [status, setStatus] = useState("PENDING")
  const [radius, setRadius] = useState<number | "">("")
  const [notes, setNotes] = useState("")
  const [address, setAddress] = useState("")

  useEffect(() => {
    if (!uuid) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getPublicSubcontractor(uuid)
        if (!cancelled) {
            setSubcontractor(data)
            setStatus(data.daily_availability_status || "PENDING")
            setRadius(data.service_radius_miles ?? "")
            setNotes(data.availability_notes || "")
            setAddress(data.address || "")
        }
      } catch (err) {
        console.error("Failed to load subcontractor", err)
        if (!cancelled) setSubcontractor(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [uuid])

  const handleAddressSelect = (data: AddressData | null) => {
    if (data) {
        setAddress(data.formatted_address || "")
    } else {
        setAddress("")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !subcontractor) return
    
    setSaving(true)
    setSuccess(false)
    try {
      const payload: any = {
        daily_availability_status: status,
        availability_notes: notes,
        address: address,
      }
      if (radius !== "") {
          payload.service_radius_miles = Number(radius)
      } else {
          payload.service_radius_miles = null
      }
      
      const updated = await api.updatePublicSubcontractorAvailability(uuid, payload)
      setSubcontractor(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to update availability", err)
      alert("Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!subcontractor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
         <Card className="p-8 max-w-md space-y-4">
             <CalendarClock className="w-12 h-12 text-slate-300 mx-auto" />
             <h2 className="text-xl font-bold text-slate-800">Link Invalid or Expired</h2>
             <p className="text-slate-500">We could not find your profile. Please ask the contractor to send a new availability link.</p>
         </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <Card className="border-slate-200 shadow-sm p-5 sm:p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 text-xl font-bold shadow-sm">
              {(subcontractor.name || "?")[0].toUpperCase()}
            </div>
            <div>
              <h1 className="hidden text-xl sm:text-2xl font-bold text-slate-900 md:block">Update Your Availability</h1>
              <p className="text-sm text-slate-500 capitalize font-medium flex items-center gap-2 md:mt-1">
                 {subcontractor.name} 
                 {subcontractor.company_name && <span className="text-slate-400">&bull; {subcontractor.company_name}</span>}
              </p>
            </div>
          </div>
        </Card>

        {/* Form Card */}
        <Card className="border-slate-200 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Status Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-slate-400" /> Current Status
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all ${status === "AVAILABLE" ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                            <input type="radio" name="status" value="AVAILABLE" checked={status === "AVAILABLE"} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                            <span className="flex flex-1">
                                <span className="flex flex-col">
                                    <span className={`block text-sm font-semibold ${status === "AVAILABLE" ? "text-emerald-900" : "text-slate-900"}`}>Available</span>
                                    <span className={`mt-1 flex items-center text-xs ${status === "AVAILABLE" ? "text-emerald-700" : "text-slate-500"}`}>Ready for new dispatch</span>
                                </span>
                            </span>
                            <CheckCircle2 className={`h-5 w-5 ${status === "AVAILABLE" ? "text-emerald-600" : "text-transparent"}`} />
                        </label>
                        
                        <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all ${status === "UNAVAILABLE" ? "border-red-500 bg-red-50 ring-1 ring-red-500" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                            <input type="radio" name="status" value="UNAVAILABLE" checked={status === "UNAVAILABLE"} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                            <span className="flex flex-1">
                                <span className="flex flex-col">
                                    <span className={`block text-sm font-semibold ${status === "UNAVAILABLE" ? "text-red-900" : "text-slate-900"}`}>Unavailable</span>
                                    <span className={`mt-1 flex items-center text-xs ${status === "UNAVAILABLE" ? "text-red-700" : "text-slate-500"}`}>Busy or out of town</span>
                                </span>
                            </span>
                            <CheckCircle2 className={`h-5 w-5 ${status === "UNAVAILABLE" ? "text-red-600" : "text-transparent"}`} />
                        </label>

                        <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all ${status === "PENDING" ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                            <input type="radio" name="status" value="PENDING" checked={status === "PENDING"} onChange={(e) => setStatus(e.target.value)} className="sr-only" />
                            <span className="flex flex-1">
                                <span className="flex flex-col">
                                    <span className={`block text-sm font-semibold ${status === "PENDING" ? "text-orange-900" : "text-slate-900"}`}>Pending</span>
                                    <span className={`mt-1 flex items-center text-xs ${status === "PENDING" ? "text-orange-700" : "text-slate-500"}`}>Need to check schedule</span>
                                </span>
                            </span>
                            <CheckCircle2 className={`h-5 w-5 ${status === "PENDING" ? "text-orange-600" : "text-transparent"}`} />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                    {/* Radius */}
                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" /> Service Radius
                        </Label>
                        <div className="relative">
                            <Input 
                                type="number" 
                                min="0"
                                value={radius} 
                                onChange={(e) => setRadius(e.target.value ? Number(e.target.value) : "")} 
                                placeholder="e.g. 50"
                                className="pl-4 pr-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 text-sm font-medium">
                                miles
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">How far are you willing to travel for a job?</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" /> Specialty (Read Only)
                        </Label>
                        <div className="h-12 bg-slate-100/50 border border-slate-200 rounded-md px-4 flex items-center text-slate-600 text-base font-medium">
                            {subcontractor.specialty || "General"}
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" /> Current Address
                    </Label>
                    {subcontractor && typeof address === 'string' && (
                        <MapboxAddressInput 
                            id="sub-address"
                            placeholder="Start typing an address..."
                            defaultValue={address}
                            onAddressSelect={handleAddressSelect}
                        />
                    )}
                </div>
                
                {/* Notes */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                         Additional Availability Notes
                    </Label>
                    <Textarea 
                         value={notes} 
                         onChange={(e) => setNotes(e.target.value)} 
                         placeholder="E.g. I am only available for emergency calls this week, or I will be on vacation until the 15th."
                         className="resize-none h-32 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base p-4"
                    />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="text-sm text-slate-500 font-medium h-6">
                         {success && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Availability updated successfully!</span>}
                     </div>
                     <Button 
                         type="submit" 
                         disabled={saving}
                         className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white shadow-md transition-all rounded-xl"
                     >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {saving ? "Saving..." : "Save Availability"}
                     </Button>
                </div>
                
            </form>
        </Card>
        
        <p className="text-center text-xs text-slate-400 font-medium">
            This is a secure, private link. Please do not share it.
        </p>

      </div>
    </div>
  )
}
