export function canApproveDiscoveredLead(lead: { score?: number | null; status?: string; meta_context?: Record<string, any> | null }): boolean {
  const decision = lead.meta_context?.qualification
  return lead.status !== "REJECTED" && (lead.score ?? 0) >= 40 && decision?.version === 1 && decision?.eligible === true
}

// Only a geography-only uncertainty may be deliberately overridden per row.
// The backend recalculates this before promotion; client metadata is display only.
export function canOverrideGeography(lead: { score?: number | null; status?: string; meta_context?: Record<string, any> | null }): boolean {
  const decision = lead.meta_context?.qualification
  return lead.status !== "REJECTED" && decision?.version === 1 &&
    decision?.tier === "unverified" && decision?.segment_match === true &&
    decision?.geography_match === false && (lead.score ?? 0) >= (decision?.minimum_score ?? 40)
}
