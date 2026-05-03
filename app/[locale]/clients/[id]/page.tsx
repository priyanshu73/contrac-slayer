import { ClientDetail } from "@/components/client-detail"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { getTranslations } from "next-intl/server"
import { api } from "@/lib/api"

export default async function ClientDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id, locale } = await params

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-6">
        <AppBreadcrumb
          className="mb-4"
          items={[
            { label: "Contacts", href: `/${locale}/contacts` },
            { label: "Client Details" },
          ]}
        />
        <ClientDetail clientId={id} />
      </main>
    </div>
  )
}
