"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { getAllStates, getAreaCodesForState, type StateAbbrev } from "@/lib/area-codes"
import { loadContractorOpsNumberPrefs } from "@/lib/contractor-ops-number-prefs"
import type { TwilioAvailableNumber, TwilioProvisionResult } from "@/lib/types/twilio"

const NUMBERS_PER_AREA_CODE = 5

type OpsAiNumberPickerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function OpsAiNumberPickerDialog({
  open,
  onOpenChange,
  onSuccess,
}: OpsAiNumberPickerDialogProps) {
  const tPicker = useTranslations("profileSetup.numberPicker")
  const tOps = useTranslations("profileSetup.opsAiNumber")
  const { refreshUser } = useAuth()

  const [step, setStep] = useState<"area" | "pick">("area")
  const [selectedState, setSelectedState] = useState<StateAbbrev | null>(null)
  const [selectedAreaCodes, setSelectedAreaCodes] = useState<string[]>([])
  const [areaError, setAreaError] = useState("")

  const [pickerSearchedAreaCodes, setPickerSearchedAreaCodes] = useState<string[]>([])
  const [pickerNumbers, setPickerNumbers] = useState<TwilioAvailableNumber[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState("")
  const [pickerIsEmpty, setPickerIsEmpty] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionResult, setProvisionResult] = useState<TwilioProvisionResult | null>(null)

  const resetPicker = useCallback(() => {
    setStep("area")
    setPickerNumbers([])
    setPickerSearchedAreaCodes([])
    setPickerError("")
    setPickerIsEmpty(false)
    setProvisionResult(null)
    setProvisioning(false)
    setAreaError("")
  }, [])

  useEffect(() => {
    if (!open) {
      resetPicker()
      return
    }
    const prefs = loadContractorOpsNumberPrefs()
    if (prefs) {
      setSelectedState(prefs.state)
      setSelectedAreaCodes(prefs.areaCodes)
    }
  }, [open, resetPicker])

  const loadAvailableNumbers = async (areaCodes: string[]) => {
    const codes = [...areaCodes].filter(Boolean).sort()
    if (!codes.length) return

    setPickerLoading(true)
    setPickerError("")
    setPickerIsEmpty(false)
    setPickerNumbers([])
    setPickerSearchedAreaCodes(codes)

    try {
      const settled = await Promise.allSettled(
        codes.map(async (ac) => {
          const numbers = await api.getAvailableTwilioNumbers(ac, NUMBERS_PER_AREA_CODE)
          return numbers.map((n) => ({ ...n, area_code: ac }))
        }),
      )

      const merged: TwilioAvailableNumber[] = []
      const seen = new Set<string>()
      let hardError: unknown = null

      for (const result of settled) {
        if (result.status === "fulfilled") {
          for (const n of result.value) {
            if (!seen.has(n.phone_number)) {
              seen.add(n.phone_number)
              merged.push(n)
            }
          }
        } else {
          hardError = hardError ?? result.reason
        }
      }

      if (!merged.length && hardError) {
        setPickerIsEmpty(true)
        setPickerError(tPicker("searchFailed"))
        return
      }

      setPickerNumbers(merged)
      setPickerIsEmpty(merged.length === 0)
      if (merged.length === 0) {
        setPickerError(
          codes.length === 1
            ? tPicker("emptyTitle", { areaCode: codes[0] })
            : tPicker("emptyTriedMultiple", { areaCodes: codes.join(", ") }),
        )
      }
    } catch (err: unknown) {
      console.error("Failed to load available Twilio numbers:", err)
      setPickerIsEmpty(true)
      setPickerError(tPicker("searchFailed"))
    } finally {
      setPickerLoading(false)
    }
  }

  const pickerNumbersByAreaCode = useMemo(() => {
    const groups = new Map<string, TwilioAvailableNumber[]>()
    for (const n of pickerNumbers) {
      const ac =
        n.area_code ||
        (n.phone_number.startsWith("+1") ? n.phone_number.slice(2, 5) : "")
      if (!groups.has(ac)) groups.set(ac, [])
      groups.get(ac)!.push(n)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [pickerNumbers])

  const handleContinueToSearch = async () => {
    if (!selectedState) {
      setAreaError(tOps("errors.stateRequired"))
      return
    }
    if (!selectedAreaCodes.length) {
      setAreaError(tOps("errors.areaCodeRequired"))
      return
    }
    setAreaError("")
    setStep("pick")
    await loadAvailableNumbers(selectedAreaCodes)
  }

  const handlePickNumber = async (phoneNumber: string, areaCode: string) => {
    if (!selectedState) return
    setProvisioning(true)
    setPickerError("")
    try {
      const result = await api.provisionTwilioNumber({
        phoneNumber,
        areaCode,
        state: selectedState,
      })
      setProvisionResult(result)
      await refreshUser()
      onSuccess?.()
      setTimeout(() => onOpenChange(false), 1600)
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message ?? "")
      if (msg.includes("already_provisioned") || msg.includes("409")) {
        await refreshUser()
        onSuccess?.()
        onOpenChange(false)
        return
      }
      setPickerError(msg || tPicker("provisionFailed"))
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-black border border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            {step === "area" ? tPicker("setupTitle") : tPicker("title")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "area" ? tPicker("setupDescription") : tPicker("pickDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "area" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">{tOps("state")}</Label>
              <Select
                value={selectedState ?? ""}
                onValueChange={(v) => {
                  setSelectedState(v as StateAbbrev)
                  setSelectedAreaCodes([])
                }}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                  <SelectValue placeholder={tOps("selectState")} />
                </SelectTrigger>
                <SelectContent>
                  {getAllStates().map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedState && (
              <div className="space-y-2">
                <Label className="text-zinc-300">{tOps("areaCode")}</Label>
                <div className="border border-zinc-700 rounded-lg p-3 max-h-40 overflow-y-auto bg-zinc-950">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {getAreaCodesForState(selectedState).map((ac) => (
                      <label
                        key={ac}
                        className="flex items-center gap-2 cursor-pointer text-sm font-mono text-zinc-200"
                      >
                        <Checkbox
                          checked={selectedAreaCodes.includes(ac)}
                          onCheckedChange={(checked) => {
                            setSelectedAreaCodes((prev) =>
                              checked
                                ? [...prev, ac].sort()
                                : prev.filter((c) => c !== ac),
                            )
                          }}
                        />
                        {ac}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {areaError && (
              <p className="text-sm text-red-400">{areaError}</p>
            )}

            <Button
              type="button"
              className="w-full bg-white text-black hover:bg-zinc-200"
              onClick={() => void handleContinueToSearch()}
            >
              {tPicker("findNumbers")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {provisionResult && (
              <div className="rounded-lg border border-green-800 bg-green-950/50 px-4 py-3 text-sm text-green-200">
                <p className="font-semibold">
                  {provisionResult.dry_run ? tPicker("reservedDev") : tPicker("assigned")}
                </p>
                <p className="font-mono mt-1">{provisionResult.twilio_number}</p>
              </div>
            )}

            {pickerLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-zinc-400">
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {tPicker("searching")}
              </div>
            ) : pickerIsEmpty ? (
              <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-4 space-y-3">
                <p className="font-medium text-amber-100">{pickerError}</p>
                <p className="text-sm text-amber-200/80">{tPicker("emptyDescription")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-600 text-white hover:bg-zinc-900"
                    onClick={() => setStep("area")}
                  >
                    {tPicker("tryAnotherAreaCode")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-zinc-300"
                    onClick={() => void loadAvailableNumbers(selectedAreaCodes)}
                  >
                    {tPicker("searchAgain")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {pickerNumbersByAreaCode.map(([areaCode, numbers]) => (
                  <div key={areaCode} className="space-y-2">
                    {pickerNumbersByAreaCode.length > 1 && (
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                        {tPicker("areaCodeSection", { areaCode })}
                      </p>
                    )}
                    {numbers.map((n) => (
                      <button
                        key={n.phone_number}
                        type="button"
                        disabled={provisioning || !!provisionResult}
                        onClick={() =>
                          handlePickNumber(n.phone_number, n.area_code || areaCode)
                        }
                        className="w-full text-left rounded-lg border border-zinc-700 hover:border-white hover:bg-zinc-900 disabled:opacity-50 p-3 transition-colors"
                      >
                        <span className="font-mono text-base font-semibold">
                          {n.phone_number}
                        </span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          {[n.locality, n.region].filter(Boolean).join(", ") ||
                            "United States"}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!pickerLoading && !provisionResult && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-zinc-400"
                  onClick={() => setStep("area")}
                  disabled={provisioning}
                >
                  {tPicker("tryAnotherAreaCode")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-zinc-400"
                  onClick={() => onOpenChange(false)}
                  disabled={provisioning}
                >
                  {tPicker("maybeLater")}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
