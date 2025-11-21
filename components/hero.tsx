"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { useEffect, useRef } from "react"

function FloatingBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    interface Bubble {
      x: number
      y: number
      z: number
      radius: number
      vx: number
      vy: number
      vz: number
      color: string
      opacity: number
    }

    const bubbles: Bubble[] = []
    const bubbleCount = 25

    const colors = [
      "rgba(147, 197, 253, ",
      "rgba(196, 181, 253, ",
      "rgba(254, 202, 202, ",
      "rgba(167, 243, 208, ",
      "rgba(252, 211, 77, ",
    ]

    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 500,
        radius: 20 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.15 + Math.random() * 0.2,
      })
    }

    function animate() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      bubbles.forEach((bubble) => {
        bubble.x += bubble.vx
        bubble.y += bubble.vy
        bubble.z += bubble.vz

        if (bubble.x < -100 || bubble.x > canvas.width + 100) bubble.vx *= -1
        if (bubble.y < -100 || bubble.y > canvas.height + 100) bubble.vy *= -1
        if (bubble.z < 0 || bubble.z > 500) bubble.vz *= -1

        const scale = 500 / (500 + bubble.z)
        const scaledRadius = bubble.radius * scale
        const scaledX = bubble.x
        const scaledY = bubble.y

        const gradient = ctx.createRadialGradient(
          scaledX - scaledRadius * 0.3,
          scaledY - scaledRadius * 0.3,
          0,
          scaledX,
          scaledY,
          scaledRadius,
        )
        gradient.addColorStop(0, `${bubble.color}${bubble.opacity + 0.2})`)
        gradient.addColorStop(0.7, `${bubble.color}${bubble.opacity})`)
        gradient.addColorStop(1, `${bubble.color}0)`)

        ctx.beginPath()
        ctx.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(scaledX - scaledRadius * 0.35, scaledY - scaledRadius * 0.35, scaledRadius * 0.25, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 0.6 * scale})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }} />
  )
}

export function Hero() {
  return (
    <section className="pt-32 pb-32 px-4 relative overflow-hidden bg-gradient-to-b from-background to-white dark:to-background">
      <FloatingBubbles />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6 leading-tight">
            AI-Powered CRM for
            <span className="text-primary block mt-2">Modern Contractors</span>
          </h1>

          <p className="text-xl text-muted-foreground text-balance max-w-3xl mb-10 leading-relaxed">
            Transform your contracting business with intelligent automation. Generate invoices instantly, capture every
            lead, and close more deals all powered by cutting edge AI technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" className="text-base px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
