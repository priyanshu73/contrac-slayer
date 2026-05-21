import type { StateAbbrev } from "@/lib/area-codes"

const PREFS_KEY = "contractorops_number_prefs"

export type ContractorOpsNumberPrefs = {
  state: StateAbbrev
  areaCodes: string[]
}

export function saveContractorOpsNumberPrefs(prefs: ContractorOpsNumberPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export function loadContractorOpsNumberPrefs(): ContractorOpsNumberPrefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ContractorOpsNumberPrefs
    if (parsed?.state && Array.isArray(parsed.areaCodes) && parsed.areaCodes.length) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

export const OPS_NUMBER_PROMPT_SEEN_KEY = "contractorops_ops_number_prompt_seen"
