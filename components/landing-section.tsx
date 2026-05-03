"use client"

import { ReactNode } from "react"

interface LandingSectionProps {
  id: string
  children: ReactNode
  className?: string
}

export function LandingSection({ id, children, className }: LandingSectionProps) {
  return (
    <div
      id={id}
      data-section-id={id}
      className={`landing-section ${className ?? ""}`}
    >
      {children}
    </div>
  )
}
