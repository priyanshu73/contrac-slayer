import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format phone for display: (XXX) XXX-XXXX. Falls back to original if not 10/11 digits. */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const ten = digits.slice(1)
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
  }
  return phone
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount) || 0)
}

/** Parse a date-only SQL value (`YYYY-MM-DD`) as that calendar date, in the
 * viewer's local zone. `new Date("2026-09-28")` is midnight UTC, which renders
 * as the previous day in the Americas — so split the components instead.
 * Returns null for anything that is not a date-only string. */
export function parseCalendarDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isNaN(d.getTime()) ? null : d
}

/** Format a date-only SQL value (`YYYY-MM-DD`) as that calendar date. Full
 * timestamps (created_at, sent_at, payment times) fall back to instant
 * parsing — they are moments, not calendar dates. */
export function formatCalendarDate(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-US",
): string {
  if (!dateStr) return "—"
  const opts = options ?? { month: "short", day: "numeric", year: "numeric" }
  const d = parseCalendarDate(dateStr) ?? new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(locale, opts)
}
