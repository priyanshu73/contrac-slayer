"use client"

import { ReactNode } from "react"

interface Section {
  id: string
  label: string
}

interface LandingScrollContainerProps {
  children: ReactNode
  sections: Section[]
}

export function LandingScrollContainer({
  children,
}: LandingScrollContainerProps) {
  return (
    <div className="flex flex-col w-full">
      {children}
    </div>
  )
}
