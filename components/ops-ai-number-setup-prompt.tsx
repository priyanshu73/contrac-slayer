"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useContractorOpsNumber } from "@/hooks/useContractorOpsNumber"
import { OpsAiNumberPickerDialog } from "@/components/ops-ai-number-picker-dialog"
import { OPS_NUMBER_PROMPT_SEEN_KEY } from "@/lib/contractor-ops-number-prefs"

/**
 * Shown on the dashboard when the user has subscription access but no Ops AI number yet.
 * Opens the number picker modal (post-onboarding) so provisioning is not tied to signup.
 */
export function OpsAiNumberSetupPrompt() {
  const t = useTranslations("dashboard.opsAiNumberPrompt")
  const { user } = useAuth()
  const { number, loading, refresh } = useContractorOpsNumber()
  const [dialogOpen, setDialogOpen] = useState(false)

  const shouldOffer =
    Boolean(user?.has_access) &&
    Boolean(user?.contractor_profile) &&
    !loading &&
    !number

  useEffect(() => {
    if (!shouldOffer || typeof window === "undefined") return
    if (sessionStorage.getItem(OPS_NUMBER_PROMPT_SEEN_KEY)) return
    sessionStorage.setItem(OPS_NUMBER_PROMPT_SEEN_KEY, "1")
    setDialogOpen(true)
  }, [shouldOffer])

  if (!shouldOffer) {
    return null
  }

  return (
    <>
      <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 animate-in fade-in slide-in-from-top-2 duration-500">
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-primary/30 ring-offset-2 ring-offset-background animate-pulse"
          aria-hidden
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              aria-hidden
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.685.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold tracking-tight">{t("title")}</p>
              <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            onClick={() => setDialogOpen(true)}
          >
            {t("cta")}
          </Button>
        </div>
      </Card>

      <OpsAiNumberPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => void refresh()}
      />
    </>
  )
}
