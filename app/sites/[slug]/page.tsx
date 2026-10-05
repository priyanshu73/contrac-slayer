import { websitePublicText as t } from "@/lib/website-i18n"
import { cache } from "react"
import type { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { api } from "@/lib/api"
import { ContractorWebsite } from "@/components/websites/contractor-website"
import { isWebsiteV2 } from "@/lib/types/website"
import { websiteAssetUrl } from "@/lib/website-content"

export const dynamic = "force-dynamic"
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 5, userScalable: true }
const getWebsite = cache((slug: string) => api.getPublicWebsite(slug))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const site = await getWebsite((await params).slug)
  if (!site) return { title: t("unavailableMetadata"), robots: { index: false, follow: false } }
  let company: string
  let headline: string
  let description: string
  let image: string | null | undefined
  let title: string
  if (isWebsiteV2(site.content)) {
    company = site.content.identity.company_name
    headline = site.content.identity.headline
    description = site.content.seo.description || site.content.identity.description
    image = site.content.branding.hero_asset_id
      ? websiteAssetUrl(site.slug, site.content.branding.hero_asset_id, 1600)
      : site.content.branding.legacy_hero_image_url
    title = site.content.seo.title || `${company} | ${headline}`
  } else {
    company = site.content.company_name
    headline = site.content.headline
    description = site.content.description
    image = site.content.hero_image_url
    title = `${company} | ${headline}`
  }
  return {
    title, description, alternates: { languages: {} },
    generator: null, applicationName: company,
    appleWebApp: { title: company },
    openGraph: { title, description, type: "website", ...(image ? { images: [image] } : {}) },
  }
}

export default async function WebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const site = await getWebsite((await params).slug)
  if (!site) notFound()
  return <ContractorWebsite site={site} />
}
