import { websitePublicText as t } from "@/lib/website-i18n"
import { cache } from "react"
import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { api } from "@/lib/api"
import { ContractorWebsite } from "@/components/websites/contractor-website"

export const dynamic = "force-dynamic"
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true }
const getWebsite = cache((slug: string) => api.getPublicWebsite(slug))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getWebsite((await params).slug)
  if (!site) return { title: t("unavailableMetadata"), robots: { index: false, follow: false } }
  const title = `${site.content.company_name} | ${site.content.headline}`
  return {
    title, description: site.content.description, alternates: { languages: {} },
    generator: null, applicationName: site.content.company_name,
    appleWebApp: { title: site.content.company_name },
    openGraph: { title, description: site.content.description, type: "website", ...(site.content.hero_image_url ? { images: [site.content.hero_image_url] } : {}) },
  }
}

export default async function WebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getWebsite((await params).slug)
  if (!site) notFound()
  return <ContractorWebsite site={site} />
}
