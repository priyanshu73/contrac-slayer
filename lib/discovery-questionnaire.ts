import { z } from "zod"

export const DISCOVERY_CALL_URL = "https://cal.com/contractorops-ctbvka/30min"

export const DISCOVERY_TRADES = [
  "landscaping", "roofing", "flooring", "plumbing", "hvac", "electrical",
  "remodeling", "general", "other",
] as const

export const DISCOVERY_ASSETS = ["google_account", "business_profile", "website", "logo"] as const
export const DISCOVERY_FEATURES = ["website", "calendar", "estimates", "invoices", "client_messages"] as const

export const discoveryQuestionnaireSchema = z.object({
  business_name: z.string().trim().min(1),
  business_type: z.array(z.enum(DISCOVERY_TRADES)).min(1),
  business_type_other: z.string().trim(),
  team_size: z.enum(["", "solo", "2_5", "6_15", "16_plus"]).refine(Boolean),
  service_areas: z.string().trim().min(1),
  annual_revenue: z.enum(["", "under_100k", "100k_500k", "500k_1m", "over_1m"]),
  existing_assets: z.array(z.enum(DISCOVERY_ASSETS)),
  estimate_method: z.enum(["", "paper", "documents", "software"]).refine(Boolean),
  current_software: z.string().trim(),
  desired_features: z.array(z.enum(DISCOVERY_FEATURES)).min(1),
  ai_receptionist_interest: z.enum(["", "yes", "maybe", "no"]).refine(Boolean),
  commercial_leads_interest: z.enum(["", "yes", "maybe", "no"]).refine(Boolean),
  contact_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
})

export type DiscoveryQuestionnaire = z.infer<typeof discoveryQuestionnaireSchema>

export const DISCOVERY_STEP_FIELDS: (keyof DiscoveryQuestionnaire)[][] = [
  ["business_name", "business_type", "team_size", "service_areas"],
  ["estimate_method"],
  ["desired_features", "ai_receptionist_interest", "commercial_leads_interest"],
  ["contact_name", "email", "phone"],
]
