export function canApproveDiscoveredLead(lead: { score?: number | null; status?: string; meta_context?: Record<string, any> | null }): boolean {
  const decision = lead.meta_context?.qualification
  return lead.status !== "REJECTED" && (lead.score ?? 0) >= 40 && decision?.version === 1 && decision?.eligible === true
}
