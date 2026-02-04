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
