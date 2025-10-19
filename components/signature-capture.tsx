"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SignatureCaptureProps {
  customerName: string
  onComplete: (signature: string) => void
  onClose: () => void
}

export function SignatureCapture({ customerName, onComplete, onClose }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureType, setSignatureType] = useState<"draw" | "type">("draw")
  const [typedName, setTypedName] = useState(customerName)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing style
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleComplete = () => {
    if (!agreedToTerms) {
      alert("Please agree to the terms and conditions")
      return
    }

    if (signatureType === "draw") {
      const canvas = canvasRef.current
      if (!canvas) return
      const signature = canvas.toDataURL()
      onComplete(signature)
    } else {
      onComplete(typedName)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <Card className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl">
        <div className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Sign Quote</h2>
              <p className="mt-1 text-sm text-muted-foreground">Please sign to accept this quote</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Signature Type Toggle */}
          <div className="mb-4 flex gap-2 rounded-lg bg-muted p-1">
            <button
              onClick={() => setSignatureType("draw")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                signatureType === "draw" ? "bg-background shadow-sm" : "hover:bg-background/50"
              }`}
            >
              Draw Signature
            </button>
            <button
              onClick={() => setSignatureType("type")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                signatureType === "type" ? "bg-background shadow-sm" : "hover:bg-background/50"
              }`}
            >
              Type Name
            </button>
          </div>

          {/* Signature Input */}
          {signatureType === "draw" ? (
            <div className="space-y-3">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="h-48 w-full cursor-crosshair rounded-lg border-2 border-dashed border-border bg-muted/30"
                />
                <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Sign here
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={clearSignature} className="w-full bg-transparent">
                Clear Signature
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="typed-name">Full Name</Label>
              <Input
                id="typed-name"
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter your full name"
                className="text-2xl font-serif"
              />
              <p className="text-xs text-muted-foreground">
                By typing your name, you agree this constitutes a legal signature
              </p>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="mt-6 flex items-start gap-3 rounded-lg bg-muted/50 p-4">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-border"
            />
            <label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the terms and conditions outlined in this quote. I understand that by signing, I am entering
              into a binding agreement with {customerName} for the services and pricing described above.
            </label>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={!agreedToTerms} className="flex-1">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Complete Signature
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
