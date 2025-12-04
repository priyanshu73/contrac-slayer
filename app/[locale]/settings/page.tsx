import { SettingsTabs } from "@/components/settings-tabs"
import { useTranslations } from "next-intl"

export default function SettingsPage() {
  const t = useTranslations('settings')
  
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <SettingsTabs />
      </main>
    </div>
  )
}
