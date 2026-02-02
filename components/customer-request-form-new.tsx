"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, X, Check, Calendar, Sparkles, Clock, Shield, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { MeasurementsInput } from "@/components/measurements-input"
import { Measurements } from "@/lib/types"
import { formatPhoneForDisplay } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface CustomerRequestFormProps {
  contractorUuid: string
  contractor: any
}

export function CustomerRequestForm({ contractorUuid, contractor }: CustomerRequestFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    project_type: "",
    description: "",
  })
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
                <span>Urgent matters: Call us at <strong>{formatPhoneForDisplay(contractor.phone_number)}</strong></span>
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
      {/* Modern Professional Header */}
      <div className="mb-10">
        {/* Company Header Card */}
        <Card className="p-6 md:p-8 bg-white shadow-lg border border-gray-100 rounded-2xl mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Logo + Company Name */}
            <div className="flex items-center gap-4 md:gap-5">
              {contractor.logo_url ? (
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-50 border-2 border-gray-100 p-2 flex-shrink-0 shadow-sm">
                  <Image
                    src={contractor.logo_url}
                    alt={contractor.company_name}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    {contractor.company_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {contractor.company_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Verified Professional</span>
                  </span>
                  {contractor.phone_number && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{formatPhoneForDisplay(contractor.phone_number)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Schedule Call CTA */}
            {contractor.calendar_link && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 md:px-8 md:py-6 rounded-xl font-semibold text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full md:w-auto"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Schedule a Call
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle>Schedule a call with {contractor.company_name}</DialogTitle>
                  </DialogHeader>
                  <div className="p-4 pt-2">
                    <iframe
                      src={contractor.calendar_link}
                      title="Schedule a call"
                      className="w-full h-[70vh] rounded-md border"
                      style={{ border: "none" }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </Card>

        {/* Benefit-Focused Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 md:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 text-base md:text-lg">
                Help us help you: Get the most accurate quote
              </h3>
              <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                Include photos, measurements, project details, and timeline for the most accurate quote.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Better pricing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Faster turnaround</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Free estimate</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
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
              <Label htmlFor="description">Project Description *</Label>
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
            measurements={measurements}
            onMeasurementsChange={setMeasurements}
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
        <div className="flex justify-center pt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg w-full md:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit Quote Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}

