"use client"

import { websitePublicText as t } from "@/lib/website-i18n"

export default function WebsiteError({ reset }: { reset: () => void }) {
  return <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center"><h1 className="text-3xl font-semibold">{t("errorTitle")}</h1><p className="mt-3 text-gray-500">{t("errorDescription")}</p><button onClick={reset} className="mt-6 rounded-lg bg-black px-5 py-3 text-white">{t("retry")}</button></main>
}
