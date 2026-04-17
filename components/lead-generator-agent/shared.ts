import type { Campaign, CampaignStatus, DiscoveryForecastScenario } from '@/lib/types'

export const SEGMENT_OPTIONS = [
  { value: 'hoa', label: 'HOAs / homeowner associations' },
  { value: 'small_commercial_property_owner', label: 'Small commercial property owners' },
  { value: 'insurance_adjuster_restoration', label: 'Insurance adjusters / restoration companies' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'general_contractor', label: 'General contractor' },
  { value: 'facility_manager', label: 'Facility manager' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'custom', label: 'Custom' },
]

export const EXECUTION_MODE_OPTIONS = [
  { value: 'REVIEW', label: 'Copilot' },
  { value: 'AUTOPILOT', label: 'Autopilot' },
]

export const PREFERRED_CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
]

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function sentenceCase(value?: string | null) {
  if (!value) return 'Unknown'
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getCampaignStatusTone(status: CampaignStatus) {
  switch (status) {
    case 'ACTIVE':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'AWAITING_REVIEW':
    case 'BRIEFING':
    case 'DISCOVERING':
    case 'GENERATING':
    case 'SENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'PAUSED':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-sky-50 text-sky-700 border-sky-200'
  }
}

export function getCheckpointLabel(value?: string | null) {
  if (!value) return 'No checkpoint pending'
  if (value === 'brief') return 'Brief approval'
  if (value === 'discovery') return 'Lead review'
  if (value === 'messaging') return 'Messaging approval'
  return sentenceCase(value)
}

export function getLocationSummary(location: Record<string, any> | undefined) {
  if (!location) return 'No geography set'
  const parts = [location.city, location.state, location.postal_code].filter(Boolean)
  const base = parts.join(', ')
  if (location.radius_miles) {
    return `${base || 'Custom area'} • ${location.radius_miles} mi radius`
  }
  return base || 'Custom area'
}

export function getSegmentSummary(campaign: Campaign) {
  if (!campaign.segments.length) return 'No segments'
  return campaign.segments
    .map((segment) => sentenceCase(segment.type || segment.segment || 'custom'))
    .join(', ')
}

export function getExpectedScenario(campaign: Campaign): DiscoveryForecastScenario | null {
  return campaign.discovery_forecast?.aggregate_forecast?.expected ?? null
}

export function getForecastRangeText(scenario: DiscoveryForecastScenario | null, preferredChannel = 'email') {
  if (!scenario) return 'No forecast yet'
  const channelKey = preferredChannel === 'phone' ? 'reachable_with_phone' : 'reachable_with_email'
  const reachable = scenario[channelKey as keyof DiscoveryForecastScenario]
  return `${reachable} reachable via ${preferredChannel}`
}
