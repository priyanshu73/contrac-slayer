"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Phone, ShieldCheck } from "lucide-react"
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
  const [step, setStep] = useState<"area" | "pick">("area")
  const [selectedState, setSelectedState] = useState<StateAbbrev | null>(null)
  const [selectedAreaCodes, setSelectedAreaCodes] = useState<string[]>([])
  const [areaError, setAreaError] = useState("")

  const [pickerNumbers, setPickerNumbers] = useState<TwilioAvailableNumber[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState("")
  const [pickerIsEmpty, setPickerIsEmpty] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionResult, setProvisionResult] = useState<TwilioProvisionResult | null>(null)

  const resetPicker = useCallback(() => {
    setStep("area")
    setPickerNumbers([])
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
      if (
        result.status === "already_provisioned" &&
        result.twilio_number &&
        result.twilio_number !== phoneNumber
      ) {
        setPickerError(
          tPicker("provisionFailed") +
            ` (${result.twilio_number} is already assigned to this account.)`,
        )
        return
      }
      setProvisionResult(result)
      onSuccess?.()
      setTimeout(() => onOpenChange(false), 1600)
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message ?? "")
      setPickerError(msg || tPicker("provisionFailed"))
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ops-ai-number-picker max-w-[548px] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[20px] border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_22px_70px_rgba(11,35,59,0.25)] sm:max-w-[548px] gap-0 [&_[data-slot=dialog-close]]:top-6 [&_[data-slot=dialog-close]]:right-6 [&_[data-slot=dialog-close]]:text-slate-500">
        <DialogHeader className="flex-row items-start gap-3 px-5 pb-3 pt-6 pr-12 text-left sm:px-6 sm:pr-12">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600" aria-hidden="true">
            <Phone className="size-5" />
          </span>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
              {step === "area" ? tPicker("setupTitle") : tPicker("title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-500">
              {step === "area" ? tPicker("setupDescriptionShort") : tPicker("pickDescription")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {step === "area" ? (
          <div className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">{tOps("state")}</Label>
              <Select
                value={selectedState ?? ""}
                onValueChange={(v) => {
                  setSelectedState(v as StateAbbrev)
                  setSelectedAreaCodes([])
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 focus:ring-sky-200">
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
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-slate-700">{tOps("areaCode")}</Label>
                  <span className="text-xs font-semibold text-sky-600">{tOps("areaCodesSelected", { count: selectedAreaCodes.length })}</span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {getAreaCodesForState(selectedState).map((ac) => (
                      <label
                        key={ac}
                        className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-sky-300 ${selectedAreaCodes.includes(ac) ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-800 hover:border-sky-200"}`}
                      >
                        <Checkbox
                          className="border-slate-400 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white"
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
              <p role="alert" className="text-sm text-red-600">{areaError}</p>
            )}

            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <ShieldCheck className="size-4 shrink-0 text-sky-600" aria-hidden="true" />
              {tPicker("purchaseReassurance")}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => onOpenChange(false)}>
                {tPicker("maybeLater")}
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-sky-600 px-4 text-white hover:bg-sky-700"
                onClick={() => void handleContinueToSearch()}
              >
                {tPicker("findNumbers")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-5 pb-5 sm:px-6">
            {provisionResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <p className="font-semibold">
                  {provisionResult.dry_run ? tPicker("reservedDev") : tPicker("assigned")}
                </p>
                <p className="font-mono mt-1">{provisionResult.twilio_number}</p>
              </div>
            )}

            {pickerLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                <div className="h-5 w-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                {tPicker("searching")}
              </div>
            ) : pickerIsEmpty ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
                <p className="font-medium text-amber-900">{pickerError}</p>
                <p className="text-sm text-amber-800">{tPicker("emptyDescription")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() => setStep("area")}
                  >
                    {tPicker("tryAnotherAreaCode")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs font-semibold text-slate-700"
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
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
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
                        className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 text-slate-900 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50"
                      >
                        <span className="font-mono text-base font-semibold">
                          {n.phone_number}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {[n.locality, n.region].filter(Boolean).join(", ") ||
                            "United States"}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {pickerError && !pickerIsEmpty && !provisionResult && (
              <p role="alert" className="text-sm text-red-600">{pickerError}</p>
            )}

            {!pickerLoading && !provisionResult && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-500"
                  onClick={() => setStep("area")}
                  disabled={provisioning}
                >
                  {tPicker("tryAnotherAreaCode")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-500"
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
