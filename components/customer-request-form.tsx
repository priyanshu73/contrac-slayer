"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Upload, X, Check } from "lucide-react"
import Image from "next/image"

const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: "Natural Flagstone",
    category: "Patio Material",
    price: 12.99,
    unit: "sq ft",
    image: "/flagstone-patio-close-up.jpg",
  },
  {
    id: 2,
    name: "Bluestone Pavers",
    category: "Patio Material",
    price: 15.99,
    unit: "sq ft",
    image: "/natural-stone-patio-inspiration.jpg",
  },
  {
    id: 3,
    name: "Concrete Pavers",
    category: "Patio Material",
    price: 8.99,
    unit: "sq ft",
    image: "/natural-stone-patio-inspiration.jpg",
  },
  {
    id: 4,
    name: "Decomposed Granite",
    category: "Base Material",
    price: 45.0,
    unit: "ton",
    image: "/natural-stone-patio-inspiration.jpg",
  },
  {
    id: 5,
    name: "Polymeric Sand",
    category: "Joint Material",
    price: 32.99,
    unit: "bag",
    image: "/natural-stone-patio-inspiration.jpg",
  },
]

interface CustomerRequestFormProps {
  contractorId: number
  contractorName: string
}

export function CustomerRequestForm({ contractorId, contractorName }: CustomerRequestFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    project_type: "",
    description: "",
  })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
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

  const toggleProduct = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const { api } = await import("@/lib/api")
      await api.submitQuoteRequest(contractorId, formData, uploadedFiles)
      setIsSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to submit request")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for your project request. We&apos;ll review your details and get back to you within 24 hours with
            a detailed quote.
          </p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll receive an email at <strong>{formData.email}</strong> with a link to track your quote.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
            <Image src="/landscaping-company-logo.png" alt="Logo" width={32} height={32} className="rounded" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Request a Quote</h1>
            <p className="text-sm text-muted-foreground">{contractorName}</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          Tell us about your project and we&apos;ll provide a detailed quote within 24 hours.
        </p>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          
          {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
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
                placeholder="123 Main St, City, State 12345"
                required
              />
            </div>
          </div>
        </Card>

        {/* Project Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project_type">Project Type *</Label>
              <Input
                id="project_type"
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                placeholder="e.g., Patio Installation, Lawn Care, Tree Removal"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Project Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project in detail. Include dimensions, timeline, and any specific requirements..."
                rows={6}
                required
              />
            </div>
          </div>
        </Card>

        {/* Photo Upload */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Project Photos</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload photos of the project area to help us provide an accurate quote.
          </p>

          <div className="space-y-4">
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload photos</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB each</p>
              </div>
              <input type="file" accept="image/*,video/*" multiple onChange={handleFileUpload} className="hidden" />
            </label>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-xs text-muted-foreground px-2 text-center truncate">{file.name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Material Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Preferred Materials (Optional)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Select any materials you&apos;d like us to include in your quote. We&apos;ll provide alternatives if needed.
          </p>

          <div className="space-y-3">
            {SAMPLE_PRODUCTS.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => toggleProduct(product.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedProducts.includes(product.id)
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">${product.price}</p>
                        <p className="text-xs text-muted-foreground">per {product.unit}</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedProducts.includes(product.id) ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {selectedProducts.includes(product.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Submit Button */}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting Request..." : "Submit Quote Request"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By submitting this form, you agree to be contacted about your project request.
        </p>
      </form>
    </div>
  )
}
