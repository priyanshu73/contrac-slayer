"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { X, Plus, Calculator } from "lucide-react"
import { MeasurementItem, Measurements } from "@/lib/types"

interface MeasurementsInputProps {
  value: Measurements
  onChange: (measurements: Measurements) => void
}

export function MeasurementsInput({ value, onChange }: MeasurementsInputProps) {
  const [measurements, setMeasurements] = useState<MeasurementItem[]>(value.items || [])

  const updateMeasurements = (newMeasurements: MeasurementItem[]) => {
    setMeasurements(newMeasurements)
    onChange({ items: newMeasurements })
  }

  const addMeasurement = () => {
    const newMeasurement: MeasurementItem = {
      type: 'dimensions',
      unit: 'ft'
    }
    updateMeasurements([...measurements, newMeasurement])
  }

  const removeMeasurement = (index: number) => {
    updateMeasurements(measurements.filter((_, i) => i !== index))
  }

  const updateMeasurement = (index: number, updates: Partial<MeasurementItem>) => {
    const updated = measurements.map((m, i) => 
      i === index ? { ...m, ...updates } : m
    )
    updateMeasurements(updated)
  }

  const calculateArea = (length?: number, width?: number): number | null => {
    if (length && width && length > 0 && width > 0) {
      return length * width
    }
    return null
  }

  const formatArea = (area: number, unit?: string): string => {
    const u = unit || 'ft'
    return `${area.toFixed(2)} ${u}²`
  }

  return (
    <div className="space-y-4">
      {measurements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">No measurements added yet</p>
          <p className="text-xs mt-1">Click "Add Measurement" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {measurements.map((measurement, index) => {
            const area = measurement.type === 'dimensions' 
              ? calculateArea(measurement.length, measurement.width)
              : null

            return (
              <Card key={index} className="p-4 border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-500">
                        Measurement #{index + 1}
                      </span>
                      {measurement.name && (
                        <span className="text-sm font-semibold text-gray-900">
                          - {measurement.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMeasurement(index)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Name/Description */}
                  <div>
                    <Label htmlFor={`measurement-name-${index}`} className="text-sm">
                      Name/Description (Optional)
                    </Label>
                    <Input
                      id={`measurement-name-${index}`}
                      placeholder="e.g., Patio area, Deck length, Room dimensions"
                      value={measurement.name || ''}
                      onChange={(e) => updateMeasurement(index, { name: e.target.value || undefined })}
                      className="mt-1"
                    />
                  </div>

                  {/* Type Selector */}
                  <div>
                    <Label htmlFor={`measurement-type-${index}`} className="text-sm">
                      Measurement Type
                    </Label>
                    <Select
                      value={measurement.type}
                      onValueChange={(value: 'dimensions' | 'square_footage' | 'linear_feet') => {
                        updateMeasurement(index, { 
                          type: value,
                          // Clear value when switching types
                          length: undefined,
                          width: undefined,
                          value: undefined
                        })
                      }}
                    >
                      <SelectTrigger id={`measurement-type-${index}`} className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dimensions">Dimensions (Length × Width)</SelectItem>
                        <SelectItem value="square_footage">Square Footage</SelectItem>
                        <SelectItem value="linear_feet">Linear Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional Fields Based on Type */}
                  {measurement.type === 'dimensions' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`measurement-length-${index}`} className="text-sm">
                          Length (Optional)
                        </Label>
                        <Input
                          id={`measurement-length-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={measurement.length || ''}
                          onChange={(e) => updateMeasurement(index, { 
                            length: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`measurement-width-${index}`} className="text-sm">
                          Width (Optional)
                        </Label>
                        <Input
                          id={`measurement-width-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={measurement.width || ''}
                          onChange={(e) => updateMeasurement(index, { 
                            width: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {(measurement.type === 'square_footage' || measurement.type === 'linear_feet') && (
                    <div>
                      <Label htmlFor={`measurement-value-${index}`} className="text-sm">
                        {measurement.type === 'square_footage' ? 'Square Footage' : 'Linear Feet'} (Optional)
                      </Label>
                      <Input
                        id={`measurement-value-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={measurement.value || ''}
                        onChange={(e) => updateMeasurement(index, { 
                          value: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {/* Unit Selector */}
                  <div>
                    <Label htmlFor={`measurement-unit-${index}`} className="text-sm">
                      Unit (Optional)
                    </Label>
                    <Select
                      value={measurement.unit || 'ft'}
                      onValueChange={(value) => updateMeasurement(index, { unit: value })}
                    >
                      <SelectTrigger id={`measurement-unit-${index}`} className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {measurement.type === 'square_footage' ? (
                          <>
                            <SelectItem value="sq ft">Square Feet (sq ft)</SelectItem>
                            <SelectItem value="sq m">Square Meters (sq m)</SelectItem>
                            <SelectItem value="sq in">Square Inches (sq in)</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="ft">Feet (ft)</SelectItem>
                            <SelectItem value="in">Inches (in)</SelectItem>
                            <SelectItem value="m">Meters (m)</SelectItem>
                            <SelectItem value="yd">Yards (yd)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Area Display for Dimensions */}
                  {measurement.type === 'dimensions' && area !== null && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        Calculated Area: {formatArea(area, measurement.unit)}
                      </span>
                    </div>
                  )}

                  {/* Display for Square Footage or Linear Feet */}
                  {(measurement.type === 'square_footage' || measurement.type === 'linear_feet') && measurement.value && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm font-semibold text-gray-900">
                        {measurement.type === 'square_footage' ? 'Square Footage' : 'Linear Feet'}: {measurement.value.toFixed(2)} {measurement.unit || 'ft'}
                        {measurement.type === 'square_footage' && '²'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addMeasurement}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Measurement
      </Button>
    </div>
  )
}

