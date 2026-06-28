"use client"

import { AuthGuard } from "@/components/auth-guard"
import { FollowupsManager } from "@/components/followups-manager"

export default function SchedulingPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <main className="container mx-auto px-4 py-6">
          <FollowupsManager />
        </main>
      </div>
    </AuthGuard>
  )
}
