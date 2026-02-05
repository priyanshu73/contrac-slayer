/**
 * Address formatting utilities for clean, professional display
 * 
 * DO NOT show raw Mapbox formatted_address in UI - it's too long and robotic.
 * Instead, format addresses cleanly for human readability.
 */

import { AddressData } from './types/address'

/**
 * Format address for nice display in UI
 * 
 * Good:
 *   300 North Washington Street
 *   Gettysburg, PA 17325
 * 
 * Bad (raw Mapbox):
 *   300 North Washington Street, Gettysburg, Pennsylvania 17325, United States
 * 
 * @param address - Address object with components
 * @param oneLine - If true, return single line with line break. Default is two-line format.
 * @returns Formatted address string
 */
export function formatAddressForDisplay(
  address: AddressData | null | undefined,
  oneLine: boolean = false
): string {
  if (!address) return ''

  const lines: string[] = []
  
  // Line 1: Street address
  if (address.street_line) {
    lines.push(address.street_line)
  }
  
  // Line 2: City, State Zip
  const cityStateZip: string[] = []
  if (address.city) {
    cityStateZip.push(address.city)
  }
  if (address.state) {
    cityStateZip.push(address.state)
  }
  if (address.zip) {
    cityStateZip.push(address.zip)
  }
  
  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(', '))
  }
  
  // Return based on format preference
  if (oneLine) {
    return lines.join(', ')
  }
  
  return lines.join('\n')
}

/**
 * Format legacy string address (fallback for old records)
 * Just returns the string as-is since we can't parse it reliably
 */
export function formatLegacyAddress(address: string | null | undefined): string {
  return address || ''
}

/**
 * Format address for single-line display (e.g., in tables, lists)
 * Example: "300 North Washington Street, Gettysburg, PA 17325"
 */
export function formatAddressOneLine(
  address: AddressData | null | undefined
): string {
  return formatAddressForDisplay(address, true)
}

/**
 * Format address for multi-line display (e.g., in forms, details)
 * Example:
 *   300 North Washington Street
 *   Gettysburg, PA 17325
 */
export function formatAddressTwoLine(
  address: AddressData | null | undefined
): string {
  return formatAddressForDisplay(address, false)
}

/**
 * Get short location string (City, State only - no street)
 * Example: "Gettysburg, PA"
 */
export function formatCityState(
  address: AddressData | null | undefined
): string {
  if (!address) return ''
  
  const parts: string[] = []
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  
  return parts.join(', ')
}

/**
 * Street-only display for UI (no city, state, zip, country).
 * Use this for client cards/lists. For map links, always use the full address.
 *
 * @param fullAddress - Full address string (e.g. from API resolved_address)
 * @param addressData - Optional normalized address with street_line
 */
export function formatAddressStreetForDisplay(
  fullAddress: string | null | undefined,
  addressData?: { street_line?: string | null } | null
): string {
  if (addressData?.street_line?.trim()) return addressData.street_line.trim()
  if (!fullAddress?.trim()) return ''
  const s = fullAddress.trim()
  const firstLine = s.split('\n')[0]?.trim() ?? s
  const firstPart = firstLine.split(',')[0]?.trim() ?? firstLine
  return firstPart || s
}
