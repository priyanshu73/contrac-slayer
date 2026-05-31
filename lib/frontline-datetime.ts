/** Frontline API timestamps are UTC from Python but often omit a trailing Z. */

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/** Parse API datetimes as UTC; display with browser-local formatters. */
export function parseApiUtcDate(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00Z`)
  }

  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}Z`)
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar day from YYYY-MM-DD (week chart bucket keys). */
export function parseCalendarDateYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function formatFrontlineActivityDate(value?: string | null): string {
  const date = parseApiUtcDate(value)
  if (!date) return "just now"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function formatWeeklyChartDayLabel(dateYmd: string, fallback?: string): string {
  const localDay = parseCalendarDateYmd(dateYmd)
  if (!localDay) return fallback ?? dateYmd
  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(localDay)
}
