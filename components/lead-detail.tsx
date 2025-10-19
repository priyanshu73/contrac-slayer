"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function LeadDetail({ leadId }: { leadId: string }) {
  const [newNote, setNewNote] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Mock data - would come from database
  const lead = {
    id: leadId,
    name: "Sarah Johnson",
    service: "Landscaping - Patio Installation",
    status: "new",
    phone: "(555) 123-4567",
    email: "sarah.j@email.com",
    address: "123 Oak Street, Springfield, IL 62701",
    source: "Google Search",
    createdAt: "Oct 17, 2025 at 2:30 PM",
    projectDescription:
      "I'm looking to install a new patio in my backyard. The area is approximately 20x15 feet. I'd like to use natural stone pavers if possible. The ground is currently grass and slopes slightly toward the house, so drainage will be important. I've attached photos of the current space and some inspiration images of the style I'm going for. I'm hoping to have this completed before the summer.",
    media: [
      { id: 1, type: "image", url: "/backyard-grass-area-for-patio.jpg", caption: "Current backyard space" },
      { id: 2, type: "image", url: "/backyard-angle-showing-slope.jpg", caption: "View showing slope" },
      { id: 3, type: "image", url: "/natural-stone-patio-inspiration.jpg", caption: "Inspiration - style I like" },
      { id: 4, type: "image", url: "/flagstone-patio-close-up.jpg", caption: "Close-up of stone style" },
    ],
    materialSuggestions: [
      {
        id: 1,
        product: "Natural Flagstone Pavers",
        quantity: "300 sq ft",
        notes: "Prefer earth tones - browns and grays",
      },
      { id: 2, product: "Polymeric Sand", quantity: "As needed", notes: "For joints between pavers" },
      { id: 3, product: "Gravel Base", quantity: "As needed", notes: "For proper drainage" },
    ],
    notes: "Interested in weekly service starting next month. Has a large front and back yard.",
  }

  const communications = [
    {
      id: 1,
      type: "note",
      content: "Initial contact made via phone. Customer interested in patio installation.",
      timestamp: "Oct 17, 2025 at 3:00 PM",
      author: "You",
    },
    {
      id: 2,
      type: "email",
      content: "Customer submitted detailed project request with photos and material preferences.",
      timestamp: "Oct 17, 2025 at 3:30 PM",
      author: "System",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-[var(--status-new)]/10 text-[var(--status-new)]"
      case "contacted":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      case "quoted":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      {/* Lead Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-2xl font-semibold">{lead.name.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{lead.name}</h2>
                <p className="mt-1 text-lg text-muted-foreground">{lead.service}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(lead.status)}`}>
                {lead.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-sm">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">{lead.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm">{lead.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-muted-foreground">{lead.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Project Description Card */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Project Description</h3>
        <Accordion type="single" collapsible defaultValue="description">
          <AccordionItem value="description" className="border-none">
            <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline">
              {lead.projectDescription.substring(0, 100)}...
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-relaxed">{lead.projectDescription}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Media Gallery Card */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Customer Photos & Videos</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {lead.media.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedImage(item.url)}
              className="group relative shrink-0 overflow-hidden rounded-lg border border-border transition-all hover:border-primary"
            >
              <img
                src={item.url || "/placeholder.svg"}
                alt={item.caption}
                className="h-32 w-48 object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs text-white">{item.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Material Suggestions Card */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Customer Material Requests</h3>
        <div className="space-y-3">
          {lead.materialSuggestions.map((material) => (
            <div key={material.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold">{material.product}</h4>
                <p className="mt-1 text-sm text-muted-foreground">Quantity: {material.quantity}</p>
                {material.notes && <p className="mt-1 text-sm text-muted-foreground italic">{material.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 md:hidden">
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" asChild>
            <a href={`/invoices/new?leadId=${lead.id}`}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Build AI Quote
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href={`tel:${lead.phone}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </a>
          </Button>
        </div>
      </div>

      {/* Desktop action buttons */}
      <Card className="hidden p-6 md:block">
        <div className="flex flex-wrap gap-2">
          <Button size="lg" asChild>
            <a href={`/invoices/new?leadId=${lead.id}`}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Build AI Quote
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`tel:${lead.phone}`}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              Call
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${lead.email}`}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/calendar/new?leadId=${lead.id}`}>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Schedule Job
            </a>
          </Button>
        </div>
      </Card>

      {/* Communication History */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Communication History</h3>
        <div className="space-y-4">
          {communications.map((comm) => (
            <div key={comm.id} className="flex gap-3 rounded-lg border border-border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {comm.type === "note" ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{comm.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{comm.author}</span>
                  <span>•</span>
                  <span>{comm.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Note Form */}
        <div className="mt-6 space-y-3">
          <Textarea
            placeholder="Add a note or log communication..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <Button>Add Note</Button>
        </div>
      </Card>

      {/* Full-screen image viewer modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={selectedImage || "/placeholder.svg"} alt="Full size" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  )
}
