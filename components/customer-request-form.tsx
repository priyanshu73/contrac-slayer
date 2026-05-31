"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, X, Check, CalendarDays, Sparkles, User, Mail, Phone, MapPin, FileText, Loader2, CheckCircle2, Clock, ImageIcon } from "lucide-react"
import Image from "next/image"
import { MeasurementsInput } from "@/components/measurements-input"
import { Measurements } from "@/lib/types"
import { formatPhoneForDisplay } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { AddressData } from "@/lib/types/address"

interface PrefillData {
  name?: string
  phone?: string
  address?: string
  description?: string
  project_type?: string
}

interface CustomerRequestFormProps {
  contractorUuid: string
  contractor: any
  prefillData?: PrefillData | null
  prefillLoading?: boolean
}

export function CustomerRequestForm({ contractorUuid, contractor, prefillData, prefillLoading }: CustomerRequestFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    project_type: "",
    description: "",
  })
  const [hasPrefilled, setHasPrefilled] = useState(false)

  // Update form when prefillData becomes available
  useEffect(() => {
    if (prefillData && !hasPrefilled) {
      setFormData(prev => ({
        ...prev,
        name: prefillData.name || prev.name,
        phone: prefillData.phone || prev.phone,
        address: prefillData.address || prev.address,
        project_type: prefillData.project_type || prev.project_type,
        description: prefillData.description || prev.description,
      }))
      setHasPrefilled(true)
    }
  }, [prefillData, hasPrefilled])
  const [measurements, setMeasurements] = useState<Measurements>({ items: [] })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [addressData, setAddressData] = useState<AddressData | null>(null)

  // Build the full booking URL from the calendar_link slug
  const bookingUrl = useMemo(() => {
    const slug = contractor?.calendar_link
    if (!slug) return undefined
    const base =
      process.env.NEXT_PUBLIC_FRONTEND_URL ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    return `${base}/book/${slug}`
  }, [contractor?.calendar_link])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setUploadedFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const { api } = await import("@/lib/api")
      const submissionData = {
        ...formData,
        ...(addressData && { address_data: addressData })
      }
      await api.submitQuoteRequest(contractorUuid, submissionData, uploadedFiles, measurements)
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit request")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-slate-900">
            Request Received!
          </h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Thank you for reaching out to <strong className="text-slate-900">{contractor.company_name}</strong>! We&apos;ve received your project details and our team is reviewing them now.
          </p>
          
          <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-100">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-slate-900 mb-1">What happens next?</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You&apos;ll receive a detailed quote via email within the next <strong className="text-blue-600">2-4 hours</strong> during business hours. We&apos;ll include pricing, timeline, and answer any questions you may have.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Confirmation sent to <strong className="text-slate-900">{formData.email}</strong></span>
            </div>
            {contractor.phone_number && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                <Phone className="w-5 h-5 text-blue-500" />
                <span>Urgent matters: Call us at <strong className="text-slate-900">{contractor.phone_number}</strong></span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <p className="text-sm text-slate-500 italic">
              &quot;We appreciate your interest and look forward to bringing your project to life!&quot;
            </p>
            <p className="text-sm text-slate-700 mt-2 font-medium">
              — {contractor.company_name} Team
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24">
      {/* Contractor Header - Modern Split Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6 hover:shadow-md transition-shadow">
        {/* Main Identity Section */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Left: Logo & Identity */}
            <div className="flex items-center sm:items-start gap-4 flex-1">
              {contractor.logo_url ? (
                <div className="relative w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex-shrink-0 overflow-hidden">
                  <Image
                    src={contractor.logo_url}
                    alt={contractor.company_name}
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-2xl font-bold text-white">
                    {contractor.company_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{contractor.company_name}</h1>
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 text-sm text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Typically responds in 2-4 hours</span>
                </div>
              </div>
            </div>

            {/* Right: Schedule CTA (Desktop) */}
            {bookingUrl && (
              <div className="hidden sm:block flex-shrink-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Schedule a call
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                      <DialogTitle>Schedule a call</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 pt-2">
                      <iframe
                        src={bookingUrl}
                        title="Schedule a call"
                        className="w-full h-[70vh] rounded-md border"
                        style={{ border: "none" }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Contact Info Grid */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{contractor.email}</span>
            </div>
            {contractor.phone_number && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{formatPhoneForDisplay(contractor.phone_number)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule CTA Footer (Mobile + alternative desktop view if calendar exists) */}
        {bookingUrl && (
          <div className="sm:hidden px-6 py-4 bg-blue-50 border-t border-blue-100">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Schedule a call
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Schedule a call</DialogTitle>
                </DialogHeader>
                <div className="p-4 pt-2">
                  <iframe
                    src={bookingUrl}
                    title="Schedule a call"
                    className="w-full h-[70vh] rounded-md border"
                    style={{ border: "none" }}
                  />
                </div>
              </DialogContent>
            </Dialog>
            <p className="text-xs text-blue-600 text-center mt-2">Recommended for complex projects</p>
          </div>
        )}
      </div>
      
      {/* Tips Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-4 mb-6 border border-blue-100">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Help us help you:</span> Include photos, measurements, project details, and timeline for the most accurate quote.
        </p>
        <div className="text-xs text-slate-500 mt-1">
          More details = Better pricing • Faster turnaround • Free estimate
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <X className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">1</span>
              <h2 className="text-lg font-semibold text-slate-900">Contact Information</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Smith"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@email.com"
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <MapboxAddressInput
                label="Project Address"
                placeholder="Start typing the project address..."
                required
                onAddressSelect={(data) => {
                  setAddressData(data)
                  if (data) {
                    setFormData({ ...formData, address: data.formatted_address || "" })
                  }
                }}
                defaultValue={formData.address}
                className="space-y-2"
              />
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">2</span>
              <h2 className="text-lg font-semibold text-slate-900">Project Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_type" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Project Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="project_type"
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  className="w-full h-11 px-3 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select project type</option>
                  <option value="bathroom_renovation">Bathroom Renovation</option>
                  <option value="kitchen_renovation">Kitchen Renovation</option>
                  <option value="flooring">Flooring Installation</option>
                  <option value="painting">Painting</option>
                  <option value="roofing">Roofing</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical Work</option>
                  <option value="hvac">HVAC</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="general_construction">General Construction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Project Description <span className="text-red-500">*</span>
                  </Label>
                  {prefillLoading && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Loading from your call...
                    </span>
                  )}
                  {hasPrefilled && prefillData?.description && !prefillLoading && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Pre-filled from your call
                    </span>
                  )}
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Please describe your project in detail. Include what work needs to be done, any specific requirements, timeline, and budget range if you have one."
                    rows={5}
                    required
                    className="pl-10 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">3</span>
              <h2 className="text-lg font-semibold text-slate-900">Measurements</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Optional</span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Adding measurements helps us provide more accurate estimates. You can add rooms, areas, or specific items that need work.
            </p>
            <MeasurementsInput
              value={measurements}
              onChange={setMeasurements}
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">4</span>
              <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Optional</span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Photos help us understand the scope of your project better. Include before photos, problem areas, or any references you&apos;d like to share.
            </p>
            
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      Click to upload files
                    </span>
                    <span className="text-sm text-slate-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB each</p>
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded Files</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            {bookingUrl ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto border-slate-200">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Schedule a call instead
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Schedule a call</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 pt-2">
                    <iframe
                      src={bookingUrl}
                      title="Schedule a call"
                      className="w-full h-[70vh] rounded-md border"
                      style={{ border: "none" }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div />
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-lg font-medium text-base w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Quote Request"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
