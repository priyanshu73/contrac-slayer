"use client"

import { useState, useEffect } from "react"
import { Loader } from "@/components/loader"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time - replace with your actual loading logic
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <Loader />
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Content Loaded!
        </h1>
        <p className="text-gray-600 mt-2">
          Your page content goes here.
        </p>
      </div>
    </main>
  )
}
