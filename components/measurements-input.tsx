"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus, Calculator, Ruler, Square, Move } from "lucide-react"
import { MeasurementItem, Measurements } from "@/lib/types"

interface MeasurementsInputProps {
  value: Measurements
  onChange: (measurements: Measurements) => void
}

export function MeasurementsInput({ value, onChange }: MeasurementsInputProps) {
  const [measurements, setMeasurements] = useState<MeasurementItem[]>(value.items || [])

  // Sync with external value changes (e.g., when populated from lead)
  useEffect(() => {
    if (value.items && JSON.stringify(value.items) !== JSON.stringify(measurements)) {
      setMeasurements(value.items)
    }
  }, [value.items])

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
    return `${area.toFixed(2)} sq ${u}`
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dimensions':
        return <Move className="h-4 w-4" />
      case 'square_footage':
        return <Square className="h-4 w-4" />
      default:
        return <Ruler className="h-4 w-4" />
    }
  }

  const getTypeBadgeStyles = (type: string) => {
    switch (type) {
      case 'dimensions':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
      case 'square_footage':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dimensions':
        return 'L×W'
      case 'square_footage':
        return 'Area'
      default:
        return 'Linear'
    }
  }

  return (
    <div className="space-y-4">
      {measurements.length === 0 ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-500/10 mb-4">
              <Ruler className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">No measurements added yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add dimensions, square footage, or linear measurements to generate accurate estimates
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {measurements.map((measurement, index) => {
            const area = measurement.type === 'dimensions' 
              ? calculateArea(measurement.length, measurement.width)
              : null

            return (
              <div 
                key={index} 
                className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getTypeBadgeStyles(measurement.type)}`}>
                      {getTypeIcon(measurement.type)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {measurement.name || `Measurement #${index + 1}`}
                      </p>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${getTypeBadgeStyles(measurement.type)}`}>
                        {getTypeLabel(measurement.type)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMeasurement(index)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Name/Description */}
                  <div>
                    <Label htmlFor={`measurement-name-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Name/Description
                    </Label>
                    <Input
                      id={`measurement-name-${index}`}
                      placeholder="e.g., Patio area, Deck length, Room dimensions"
                      value={measurement.name || ''}
                      onChange={(e) => updateMeasurement(index, { name: e.target.value || undefined })}
                      className="mt-1.5 h-10 border-slate-200"
                    />
                  </div>

                  {/* Type Selector */}
                  <div>
                    <Label htmlFor={`measurement-type-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Type
                    </Label>
                    <Select
                      value={measurement.type}
                      onValueChange={(value: 'dimensions' | 'square_footage' | 'linear_feet') => {
                        updateMeasurement(index, { 
                          type: value,
                          length: undefined,
                          width: undefined,
                          value: undefined
                        })
                      }}
                    >
                      <SelectTrigger id={`measurement-type-${index}`} className="mt-1.5 h-10 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dimensions">Dimensions (Length × Width)</SelectItem>
                        <SelectItem value="square_footage">Square Footage</SelectItem>
                        <SelectItem value="linear_feet">Linear Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    {measurement.type === 'dimensions' ? (
                      <>
                        <div>
                          <Label htmlFor={`measurement-length-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Length
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
                            className="mt-1.5 h-10 border-slate-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`measurement-width-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Width
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
                            className="mt-1.5 h-10 border-slate-200"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor={`measurement-value-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {measurement.type === 'square_footage' ? 'Square Footage' : 'Linear Feet'}
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
                            className="mt-1.5 h-10 border-slate-200"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`measurement-unit-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Unit
                          </Label>
                          <Select
                            value={measurement.unit || 'ft'}
                            onValueChange={(value) => updateMeasurement(index, { unit: value })}
                          >
                            <SelectTrigger id={`measurement-unit-${index}`} className="mt-1.5 h-10 border-slate-200">
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
                      </>
                    )}
                  </div>

                  {/* Unit for Dimensions */}
                  {measurement.type === 'dimensions' && (
                    <div>
                      <Label htmlFor={`measurement-unit-${index}`} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Unit
                      </Label>
                      <Select
                        value={measurement.unit || 'ft'}
                        onValueChange={(value) => updateMeasurement(index, { unit: value })}
                      >
                        <SelectTrigger id={`measurement-unit-${index}`} className="mt-1.5 h-10 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ft">Feet (ft)</SelectItem>
                          <SelectItem value="in">Inches (in)</SelectItem>
                          <SelectItem value="m">Meters (m)</SelectItem>
                          <SelectItem value="yd">Yards (yd)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Calculated Result */}
                  {measurement.type === 'dimensions' && area !== null && (
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                        <Calculator className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Calculated Area</p>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                          {formatArea(area, measurement.unit)}
                        </p>
                      </div>
                    </div>
                  )}

                  {(measurement.type === 'square_footage' || measurement.type === 'linear_feet') && measurement.value && (
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                      measurement.type === 'square_footage' 
                        ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800'
                        : 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                        measurement.type === 'square_footage' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                      }`}>
                        {measurement.type === 'square_footage' 
                          ? <Square className="h-4 w-4 text-emerald-600" />
                          : <Ruler className="h-4 w-4 text-amber-600" />
                        }
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${
                          measurement.type === 'square_footage' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {measurement.type === 'square_footage' ? 'Total Area' : 'Total Length'}
                        </p>
                        <p className={`text-lg font-bold ${
                          measurement.type === 'square_footage' ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'
                        }`}>
                          {measurement.value.toFixed(2)} {measurement.unit || (measurement.type === 'square_footage' ? 'sq ft' : 'ft')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addMeasurement}
        className="w-full h-11 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Measurement
      </Button>
    </div>
  )
}

