import { SettingsTabs } from "@/components/settings-tabs"
import { useTranslations } from "next-intl"

export default function SettingsPage() {
  const t = useTranslations('settings')
  
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 pb-24 md:py-6 md:pb-6">
        <div className="mb-6 hidden md:block">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <SettingsTabs />
      </main>
    </div>
  )
}
