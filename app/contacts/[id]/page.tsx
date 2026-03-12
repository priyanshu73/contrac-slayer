import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Legacy non-locale route. Always redirect into locale-scoped route so NextIntl works.
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value
  const locale = cookieLocale === "es" ? "es" : "en"
  redirect(`/${locale}/clients/${encodeURIComponent(id)}`)
}
