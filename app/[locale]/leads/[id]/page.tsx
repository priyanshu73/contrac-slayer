import { LeadDetail } from "@/components/lead-detail"
import { AppBreadcrumb } from "@/components/app-breadcrumb"

export default async function LeadDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id, locale } = await params

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-6">
        <AppBreadcrumb
          className="mb-4"
          items={[
            { label: "Leads", href: `/${locale}/leads` },
            { label: "Lead Details" },
          ]}
        />
        <LeadDetail leadId={id} />
      </main>
    </div>
  )
}
