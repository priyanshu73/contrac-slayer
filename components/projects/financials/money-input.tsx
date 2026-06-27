'use client'

import { Input } from '@/components/ui/input'

/** Strip anything that isn't a number, dot, or leading minus, then parse.
 * Returns 0 for empty/garbage so a blanked cell becomes 0 rather than NaN. */
export const parseMoney = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** A plain text money input — no `type="number"`, so there are no spinner
 * (increment/decrement) buttons. `inputMode="decimal"` still gives a numeric
 * keypad on mobile. Uncontrolled: commits the parsed number on blur / Enter,
 * only when it actually changed. */
export function MoneyInput({
  value,
  onCommit,
  className,
  placeholder,
}: {
  value: number
  onCommit: (n: number) => void
  className?: string
  placeholder?: string
}) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      defaultValue={String(value ?? 0)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onBlur={(e) => {
        const parsed = parseMoney(e.currentTarget.value)
        e.currentTarget.value = String(parsed)
        if (parsed !== value) onCommit(parsed)
      }}
      className={className}
    />
  )
}
