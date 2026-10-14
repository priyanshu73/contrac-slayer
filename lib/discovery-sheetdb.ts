import type { DiscoveryQuestionnaire } from "@/lib/discovery-questionnaire"

export function toSheetDbRow(answers: DiscoveryQuestionnaire) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    contact_name: answers.contact_name,
    email: answers.email,
    phone: answers.phone,
    business_name: answers.business_name,
    business_type: answers.business_type.join(", "),
    business_type_other: answers.business_type_other,
    team_size: answers.team_size,
    service_areas: answers.service_areas,
    annual_revenue: answers.annual_revenue,
    has_google_account: answers.existing_assets.includes("google_account") ? "Yes" : "No",
    has_business_profile: answers.existing_assets.includes("business_profile") ? "Yes" : "No",
    has_website: answers.existing_assets.includes("website") ? "Yes" : "No",
    has_logo: answers.existing_assets.includes("logo") ? "Yes" : "No",
    estimate_method: answers.estimate_method,
    current_software: answers.current_software,
    desired_features: answers.desired_features.join(", "),
    ai_receptionist_interest: answers.ai_receptionist_interest,
    commercial_leads_interest: answers.commercial_leads_interest,
  }
}
