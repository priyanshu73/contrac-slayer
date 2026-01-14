"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, X, Check, CalendarDays, Sparkles } from "lucide-react"
import Image from "next/image"
import { MeasurementsInput } from "@/components/measurements-input"
import { Measurements } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PrefillData {
  description?: string
  project_type?: string
  phone?: string
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
        phone: prefillData.phone || prev.phone,
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
      await api.submitQuoteRequest(contractorUuid, formData, uploadedFiles, measurements)
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit request")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card className="p-10 text-center shadow-xl bg-white border border-gray-200">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Request Received! 🎉
          </h2>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed">
            Thank you for reaching out to <strong>{contractor.company_name}</strong>! We've received your project details and our team is reviewing them now.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900 mb-1">What happens next?</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  You'll receive a detailed quote via email within the next <strong className="text-blue-600">2-4 hours</strong> during business hours. We'll include pricing, timeline, and answer any questions you may have.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Confirmation sent to <strong>{formData.email}</strong></span>
            </div>
            {contractor.phone_number && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Urgent matters: Call us at <strong>{contractor.phone_number}</strong></span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 italic">
              "We appreciate your interest and look forward to bringing your project to life!"
            </p>
            <p className="text-sm text-gray-600 mt-2 font-medium">
              — {contractor.company_name} Team
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 py-8 pb-24">
      {/* Minimal Contractor Header */}
      <div className="mb-8 py-6 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          {contractor.logo_url ? (
            <div className="relative w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 p-1 flex-shrink-0">
              <Image
                src={contractor.logo_url}
                alt={contractor.company_name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white">
                {contractor.company_name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{contractor.company_name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
              <span>•</span>
              <span>{contractor.email}</span>
              {contractor.phone_number && (
                <>
                  <span>•</span>
                  <span>{contractor.phone_number}</span>
                </>
              )}
              <span>•</span>
              <span>2-4hr response</span>
            </div>

            {/* Minimal schedule CTA (only if calendar link exists) */}
            {contractor?.calendar_link ? (
              <div className="mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900">Want to talk it through?</div>
                          <div className="text-sm text-gray-600">
                            Book a quick call with <span className="font-medium">{contractor.company_name}</span>.
                          </div>
                        </div>
                        <Button className="w-full sm:w-auto px-5" size="lg">
                          <CalendarDays className="h-5 w-5 mr-2" />
                          Schedule a call
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Optional, but recommended for complex projects.
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                      <DialogTitle>Schedule a call</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 pt-2">
                      <iframe
                        src={contractor.calendar_link}
                        title="NeetoCal scheduling"
                        className="w-full h-[70vh] rounded-md border"
                        style={{ border: "none" }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Minimal Tips */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-medium">Help us help you:</span> Include photos, measurements, project details, and timeline for the most accurate quote.
          </p>
          <div className="text-xs text-gray-500">
            More details = Better pricing • Faster turnaround • Free estimate
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          
          {/* Contact Information */}
        <Card className="p-6 bg-white shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">1</span>
            Contact Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.smith@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Project Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street, City, State 12345"
                required
              />
            </div>
          </div>
        </Card>

        {/* Project Details */}
        <Card className="p-6 bg-white shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">2</span>
            Project Details
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project_type">Project Type *</Label>
              <select
                id="project_type"
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">Project Description *</Label>
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
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please describe your project in detail. Include what work needs to be done, any specific requirements, timeline, and budget range if you have one."
                rows={5}
                required
                className="resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Measurements */}
        <Card className="p-6 bg-white shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">3</span>
            Measurements (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Adding measurements helps us provide more accurate estimates. You can add rooms, areas, or specific items that need work.
          </p>
           <MeasurementsInput
             value={measurements}
             onChange={setMeasurements}
           />
        </Card>

        {/* Photo Upload */}
        <Card className="p-6 bg-white shadow-md border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <span className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">4</span>
            Photos (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Photos help us understand the scope of your project better. Include before photos, problem areas, or any references you'd like to share.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Click to upload files
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </label>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB each</p>
            </div>
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
              <h4 className="text-sm font-medium text-gray-900">Uploaded Files:</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Submit */}
        <div className="flex flex-col items-stretch gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {contractor?.calendar_link ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
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
                    src={contractor.calendar_link}
                    title="NeetoCal scheduling"
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit Quote Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}
