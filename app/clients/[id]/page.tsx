import { ClientDetail } from "@/components/client-detail"
import { Button } from "@/components/ui/button"

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/clients">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-none">Client Details</h1>
              <p className="text-sm text-muted-foreground">View and manage client</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <ClientDetail clientId={params.id} />
      </main>
    </div>
  )
}
