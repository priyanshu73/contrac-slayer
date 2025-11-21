import { StatsCardsReal } from "@/components/stats-cards-real"
import { QuickActions } from "@/components/quick-actions"
import { RecentLeadsReal } from "@/components/recent-leads-real"
import { UpcomingJobs } from "@/components/upcoming-jobs"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Stats Overview */}
          <StatsCardsReal />

          {/* Quick Actions */}
          <QuickActions />

          {/* Recent Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            <RecentLeadsReal />
            <UpcomingJobs />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation is now in Navbar component */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5 gap-1 p-2">
          <a href="/" className="flex flex-col items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-primary">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </a>
          <a
            href="/leads"
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="text-xs font-medium">Leads</span>
          </a>
          <a
            href="/calendar"
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs font-medium">Calendar</span>
          </a>
          <a
            href="/invoices"
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-xs font-medium">Invoices</span>
          </a>
          <a
            href="/settings"
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs font-medium">Settings</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
