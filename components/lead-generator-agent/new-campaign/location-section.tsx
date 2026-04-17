"use client"

import type { AddressData } from "@/lib/types/address"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import type { CampaignFormState } from "@/components/lead-generator-agent/new-campaign/types"

export function LocationSection({
  form,
  updateField,
}: {
  form: CampaignFormState
  updateField: <K extends keyof CampaignFormState>(field: K, value: CampaignFormState[K]) => void
}) {
  function handleAddressSelect(address: AddressData | null) {
    if (!address) {
      updateField("addressLabel", "")
      updateField("formattedAddress", "")
      updateField("city", "")
      updateField("state", "")
      updateField("postalCode", "")
      updateField("lat", null)
      updateField("lng", null)
      return
    }

    updateField("addressLabel", address.formatted_address || [address.street_line, address.city, address.state].filter(Boolean).join(", "))
    updateField("formattedAddress", address.formatted_address || "")
    updateField("city", address.city || "")
    updateField("state", address.state || "")
    updateField("postalCode", address.zip || "")
    updateField("lat", address.lat ?? null)
    updateField("lng", address.lng ?? null)
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <MapboxAddressInput
          label=""
          defaultValue={form.addressLabel}
          placeholder="Search an address or exact location"
          onAddressSelect={handleAddressSelect}
          className="space-y-0"
          inputClassName="h-11 rounded-2xl border-slate-200 text-[15px]"
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Radius</div>
              <div className="text-sm text-slate-500">Expand around the selected address.</div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-sm font-medium text-sky-700 shadow-sm">
              {form.radiusMiles} mi
            </div>
          </div>

          <div className="mt-5 px-1">
            <Slider
              min={3}
              max={50}
              step={1}
              value={[form.radiusMiles]}
              onValueChange={(value) => updateField("radiusMiles", value[0] ?? 15)}
              className="py-2"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>3 mi</span>
              <span>50 mi</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
