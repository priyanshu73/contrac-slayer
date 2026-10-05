import { websitePublicText as t } from "@/lib/website-i18n"

export default function WebsiteNotFound() {
  return <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center"><h1 className="text-3xl font-semibold">{t("unavailableTitle")}</h1><p className="mt-3 text-gray-500">{t("unavailableDescription")}</p></main>
}
