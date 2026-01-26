"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function BillingSuccessPage() {
  const router = useRouter()
  const locale = useLocale()
  const { user, refreshUser } = useAuth()
  const [isActivating, setIsActivating] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const maxPolls = 30 // Poll for up to 30 seconds

  useEffect(() => {
    // Poll for access status
    const checkAccess = async () => {
      try {
        await refreshUser()
      } catch (err) {
        console.error("Error refreshing user:", err)
      }
    }

    // If user already has access, stop polling
    if (user?.has_access) {
      setIsActivating(false)
      return
    }

    // Poll every second
    if (pollCount < maxPolls) {
      const timer = setTimeout(() => {
        checkAccess()
        setPollCount((c) => c + 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Stop polling after max attempts
      setIsActivating(false)
    }
  }, [user?.has_access, pollCount, refreshUser])

  const handleContinue = () => {
    router.push(`/${locale}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {isActivating && !user?.has_access ? (
          <>
            <div className="mb-6">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Activating Your Subscription</h1>
            <p className="text-muted-foreground mb-6">
              Please wait while we set up your account. This usually takes just a few seconds...
            </p>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min((pollCount / maxPolls) * 100, 100)}%` }}
              />
            </div>
          </>
        ) : user?.has_access ? (
          <>
            <div className="mb-6">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome Aboard!</h1>
            <p className="text-muted-foreground mb-6">
              Your subscription is now active. You have full access to all features.
              {user.stripe_subscription_status === "trialing" && (
                <span className="block mt-2 text-sm">
                  Your 14-day free trial has started.
                </span>
              )}
            </p>
            <Button onClick={handleContinue} size="lg" className="w-full">
              Go to Dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="h-16 w-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Received</h1>
            <p className="text-muted-foreground mb-6">
              Your payment was successful! Your subscription should be active shortly. 
              If you don't see access in a minute, please refresh the page or contact support.
            </p>
            <div className="space-y-3">
              <Button onClick={handleContinue} size="lg" className="w-full">
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
