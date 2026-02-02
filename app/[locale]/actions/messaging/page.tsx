"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { FollowupSettings } from "@/components/followup-settings"
import { ScheduledFollowupsList } from "@/components/scheduled-followups-list"
import { ScheduleFollowupDialog } from "@/components/schedule-followup-dialog"
import { api } from "@/lib/api"
import { ContractorProfile } from "@/lib/types"
import { AuthGuard } from "@/components/auth-guard"
import { Loader2Icon } from "lucide-react"
import { useTranslations } from "next-intl"

export default function MessagingPage() {
  const t = useTranslations("messaging")
  const [profile, setProfile] = useState<ContractorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMyProfile()
        setProfile(data)
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
              <p className="text-muted-foreground">{t("pageDescription")}</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Tabs defaultValue="scheduled" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
                    <TabsTrigger value="scheduled">{t("tabs.scheduled")}</TabsTrigger>
                    <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings">
                    <FollowupSettings contractorId={profile?.contractor_ai_sp_id} />
                  </TabsContent>

                  <TabsContent value="scheduled">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold">Scheduled Follow-ups</h2>
                          <p className="text-muted-foreground">
                            View and manage upcoming follow-up messages
                          </p>
                        </div>
                        <Button onClick={() => setShowScheduleDialog(true)}>
                          <PlusIcon className="mr-2 h-4 w-4" />
                          Schedule Follow-up
                        </Button>
                      </div>
                      <ScheduledFollowupsList
                        contractorId={profile?.contractor_ai_sp_id}
                        statusFilter="pending"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="history">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold">{t("historyTitle")}</h2>
                        <p className="text-muted-foreground">{t("historyDescription")}</p>
                      </div>
                      <ScheduledFollowupsList
                        contractorId={profile?.contractor_ai_sp_id}
                        statusFilter="all"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <ScheduleFollowupDialog
                  contractorId={profile?.contractor_ai_sp_id}
                  open={showScheduleDialog}
                  onOpenChange={setShowScheduleDialog}
                  onScheduled={() => {}}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
