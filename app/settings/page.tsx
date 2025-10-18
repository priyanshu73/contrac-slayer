import { SettingsHeader } from "@/components/settings-header"
import { SettingsTabs } from "@/components/settings-tabs"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <SettingsTabs />
      </main>
    </div>
  )
}
