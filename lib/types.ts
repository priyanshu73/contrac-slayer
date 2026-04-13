// ============================================
// COMMON TYPES & ENUMS
// ============================================

export enum JobStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  CUSTOMER_MODIFIED = 'CUSTOMER_MODIFIED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INVOICED = 'INVOICED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'QUOTE_REQUESTED'
  | 'WON'
  | 'LOST'

export type LeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'PHONE'
  | 'EMAIL'
  | 'SOCIAL_MEDIA'
  | 'ADVERTISEMENT'
  | 'WORD_OF_MOUTH'
  | 'OTHER'

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'

export type PricingTier = 'LOW' | 'MID' | 'HIGH'

// ============================================
// PROPERTY INSIGHTS (RentCast)
// ============================================

export interface PropertyMetadata {
  /** From RentCast squareFootage (new cache) */
  house_sqft?: number
  /** Legacy/cache; prefer house_sqft */
  building_sqft?: number
  lot_sqft?: number
  bedrooms?: number
  bathrooms?: number
  property_type?: string
  year_built?: number
}

export interface PropertyInsightsResponse {
  address_id: number
  property_metadata: PropertyMetadata | null
  from_cache: boolean
}

// ============================================
// ATTACHMENTS
// ============================================

export interface Attachment {
  id: number
  file_url: string
  file_type: string
  original_filename: string
  file_size: number
  created_at: string
}

export interface AttachmentCreate {
  file_url: string
  file_type: string
  original_filename: string
  file_size: number
}

// ============================================
// SIGNATURE
// ============================================

export interface Signature {
  id: number
  job_id: number
  client_id: number
  signature_image_url: string
  signed_at: string
  ip_address?: string
  user_agent?: string
  signer_name: string
}

/** Signature block attached to Job by API (dual-party: contractor + customer) */
export interface JobSignature {
  contractor_signed_at?: string | null
  customer_signed_at?: string | null
  contractor_signature_image_url?: string | null
  contractor_signature_data?: string | null
  contractor_signer_name?: string | null
  customer_signature_image_url?: string | null
  customer_signature_data?: string | null
  customer_signer_name?: string | null
}

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface User {
  id: number
  uuid: string
  email: string
  is_active: boolean
  is_email_verified: boolean
  is_contractor?: boolean
  has_access?: boolean
  stripe_customer_id?: string
  stripe_subscription_id?: string
  stripe_subscription_status?: string
  stripe_current_period_end?: string
  stripe_trial_end?: string
  created_at: string
  updated_at?: string
}

// ============================================
// LABOR & UNIT ENUMS - Contractor Pricing Engine
// ============================================

export enum LaborChargeType {
  HOURLY = 'HOURLY',
  PER_DAY = 'PER_DAY',
  CREW_PER_DAY = 'CREW_PER_DAY',
  PER_UNIT = 'PER_UNIT',
  PER_ROOM = 'PER_ROOM',
  PER_CUBIC_YARD = 'PER_CUBIC_YARD',
  FLAT_RATE = 'FLAT_RATE',
  TIME_AND_MATERIALS = 'TIME_AND_MATERIALS'
}

export enum UnitType {
  SQ_FT = 'SQ_FT',
  LINEAR_FT = 'LINEAR_FT',
  SHEET = 'SHEET',
  PIECE = 'PIECE',
  WINDOW = 'WINDOW',
  DOOR = 'DOOR',
  CABINET = 'CABINET',
  SQUARE_100_SQFT = 'SQUARE_100_SQFT',
  ROOM = 'ROOM',
  CUBIC_YARD = 'CUBIC_YARD',
  EACH = 'EACH',
  HOUR = 'HOUR',
  DAY = 'DAY',
  GALLON = 'GALLON',
  BOX = 'BOX',
  BUNDLE = 'BUNDLE',
  ROLL = 'ROLL',
  BAG = 'BAG',
  PALLET = 'PALLET'
}

// ============================================
// CONTRACTOR PROFILE
// ============================================

export interface ContractorProfile {
  id: number
  uuid: string
  user_id: number
  company_name: string
  address?: string
  phone_number?: string
  email: string
  default_markup_percentage: number
  default_sales_tax_rate: number
  low_tier_markup: number
  mid_tier_markup: number
  high_tier_markup: number
  default_labor_charge_type: LaborChargeType
  default_labor_rate_value: number  // Unified rate ($/hr, $/day, $/unit, etc.)
  default_labor_unit_type?: UnitType  // Unit for PER_UNIT charge types
  default_t_and_m_material_markup_percent?: number  // For TIME_AND_MATERIALS pricing
  default_zip_code?: string
  logo_url?: string
  website_url?: string
  contractor_ai_sp_id?: number
  calendar_link?: string
  created_at: string
  updated_at?: string
}

// Simplified contractor info for nested responses (e.g., in Job)
export interface ContractorInfo {
  id: number
  uuid?: string
  company_name: string
  address?: string
  phone_number?: string
  email: string
  logo_url?: string
  website_url?: string
}

// ============================================
// LEADS
// ============================================

export interface Lead {
  id: number
  contractor_id: number
  name: string
  email: string
  phone?: string
  address?: string
  project_type?: string
  description?: string
  status: LeadStatus
  source: LeadSource
  priority: number
  notes?: string
  estimated_value?: number
  converted_to_job_id?: number
  converted_to_client_id?: number
  last_contacted_at?: string
  created_at: string
  updated_at?: string
  attachments?: Attachment[]
  measurements?: Measurements
  contractor_ai_call_lead_id?: number
}

export interface LeadCreate {
  name: string
  email: string
  phone?: string
  address?: string
  project_type?: string
  description?: string
  status?: LeadStatus
  source?: LeadSource
  priority?: number
  notes?: string
  estimated_value?: number
}

export interface LeadUpdate {
  name?: string
  email?: string
  phone?: string
  address?: string
  project_type?: string
  description?: string
  status?: LeadStatus
  source?: LeadSource
  priority?: number
  notes?: string
  estimated_value?: number
  last_contacted_at?: string
}

// ============================================
// CLIENTS
// ============================================

export interface Client {
  id: number
  uuid: string
  contractor_id: number
  name: string
  email?: string
  phone: string
  address?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface ClientCreate {
  name: string
  email?: string
  phone: string
  address?: string
  notes?: string
}

export interface ClientUpdate {
  name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

// ============================================
// JOBS & QUOTES
// ============================================

export interface JobItem {
  id: number
  job_id: number
  material_service_id?: number
  title?: string
  custom_description?: string
  quantity: number
  unit_of_measure?: string
  cost_per_unit: number
  markup_percentage?: number
  is_taxable: boolean
  notes?: string
  brand?: string
  model?: string
  external_url?: string
  image_url?: string
  thumbnail_url?: string
  created_at: string
  updated_at?: string
}

export interface Job {
  id: number
  uuid: string
  contractor_id: number
  client_id?: number
  /** Display number for quote/job (e.g. Q-2024-001); may come from API */
  job_number?: string
  title: string
  description?: string
  status: JobStatus
  start_date?: string
  end_date?: string
  address?: string
  notes?: string
  created_at: string
  updated_at?: string
  client?: Client
  contractor?: ContractorInfo
  items?: JobItem[]
  variants?: QuoteVariant[]
  // Change order lineage
  created_from_job_id?: number
  change_order_reason?: string
  total_amount?: number
  // Signature fields
  contractor_signature?: Signature
  client_signature?: Signature
  /** Attached by API when returning job with signature block (contractor_signed_at, etc.) */
  signature?: JobSignature
  signed_quote_pdf_url?: string
  selected_tier?: PricingTier
  quote_pdf_url?: string
  /** Public link for customer quote view; set when generated via generateQuotePublicLink */
  quote_public_link?: string
  // Additional fields from API (JobResponse)
  quote_expiration_date?: string
  project_type?: string
  /** Project/job description; API uses job_description */
  job_description?: string
  payment_terms?: string
  customer_notes?: string
  /** Amount customer accepted when signing */
  accepted_total_amount?: number
  project_media?: ProjectMedia[]
  // QuickBooks sync
  qbo_invoice_id?: string
  qbo_invoice_url?: string
  qbo_synced_at?: string
}

export interface QBOInvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
}

export interface QBOInvoiceDetail {
  /** Present when loaded via project invoice-detail (for QBO payment sync). */
  job_id?: number
  qbo_invoice_id: string
  qbo_invoice_url: string
  doc_number: string
  txn_date: string
  due_date: string
  status: string
  email_status: string
  subtotal: number
  tax_total: number
  total: number
  balance: number
  amount_paid: number
  line_items: QBOInvoiceLineItem[]
  customer_memo: string
  synced_at: string | null
}

/** Paid quote on project with no QuickBooks invoice id/url — shown under QuickBooks as “other payments”. */
export interface ManualPaidQuoteSnapshot {
  job_id: number
  title: string
  job_number?: string | null
  total_amount: number
  client_name?: string | null
}

/** Response from GET /quickbooks/project/{id}/invoice-detail */
export interface QBOProjectInvoiceDetailResponse {
  quickbooks_connected: boolean
  has_invoice: boolean
  multiple_invoices: boolean
  invoice_count: number
  invoices: Array<QBOInvoiceDetail & { job_id: number }>
  /** PAID linked jobs without QBO invoice id/url */
  manual_paid_quotes: ManualPaidQuoteSnapshot[]
}

export interface ChangeOrderCreate {
  change_order_reason?: string
  job_description?: string
  items?: Array<{
    title?: string
    custom_description?: string
    quantity: number
    unit_of_measure?: string
    cost_per_unit: number
    markup_percentage?: number
    is_taxable?: boolean
    notes?: string
  }>
}

export interface RevisedContractAmount {
  original_amount: number
  approved_change_orders_total: number
  revised_amount: number
}

export interface JobCreate {
  client_id?: number
  title: string
  description?: string
  status?: JobStatus
  start_date?: string
  end_date?: string
  address?: string
  notes?: string
}

export interface JobUpdate {
  client_id?: number
  title?: string
  description?: string
  status?: JobStatus
  start_date?: string
  end_date?: string
  address?: string
  notes?: string
  selected_tier?: PricingTier
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
export type TaskType = 'TIMELINE' | 'PUNCH_LIST'
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TradeAcceptanceStatus = 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'REJECTED'

export interface Project {
  id: number
  uuid: string
  contractor_id: number
  job_id?: number
  client_id?: number
  title: string
  objective?: string
  status: ProjectStatus
  contract_value?: number
  scheduled_start_date?: string
  scheduled_end_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  tasks?: ProjectTask[]
  trades?: ProjectTrade[]
  media?: ProjectMedia[]
  attachments?: Attachment[]
  total_trades?: number
  accepted_trades?: number
  pending_trades?: number
}

export interface ProjectListItem {
  id: number
  uuid: string
  title: string
  status: ProjectStatus
  client_id?: number
  contract_value?: number
  scheduled_start_date?: string
  scheduled_end_date?: string
  total_trades?: number
  accepted_trades?: number
  pending_trades?: number
}

export interface ProjectTask {
  id: number
  project_id: number
  parent_task_id?: number | null
  title: string
  description?: string
  task_type: TaskType   // TIMELINE or PUNCH_LIST
  status: TaskStatus
  priority?: TaskPriority   // Typically used for punch list items
  category?: string         // Finishing, Installation, Final, etc.
  order?: number
  notify_client: boolean
  scheduled_start_date?: string
  scheduled_end_date?: string
  assigned_to?: string
  assigned_trade_id?: number
  photo_count: number
  document_count: number
  photos?: ProjectMedia[]
  documents?: ProjectMedia[]
}

export interface ContractorTask extends ProjectTask {
  project_title?: string
  project_status?: ProjectStatus
}

export interface ProjectTrade {
  id: number
  uuid: string
  project_id: number
  project_title?: string
  trade_type: string
  subcontractor_id?: number
  subcontractor_name: string
  subcontractor_email?: string
  contact_info: string
  scope_of_work: string
  materials_required: string[]
  acceptance_criteria: { text: string; selected: boolean }[]
  agreed_price?: number
  status: TradeAcceptanceStatus
  accepted_at?: string
  created_at?: string
  reference_media?: ProjectMedia[]
  proof_of_work_media?: ProjectMedia[]
  tasks?: ProjectTask[]
}

export type MediaType = 'DOCUMENT' | 'PHOTO' | 'VIDEO'
export type MediaContext =
  | 'PROJECT_DOCUMENT'
  | 'PROJECT_PHOTO'
  | 'TASK_PHOTO'
  | 'TASK_DOCUMENT'
  | 'TRADE_REFERENCE'
  | 'TRADE_PROOF'

export interface ProjectMedia {
  id: number
  project_id?: number
  task_id?: number
  trade_id?: number
  job_id?: number
  file_url: string
  file_name: string
  file_size: number
  media_type: MediaType
  context: MediaContext
  uploaded_by: string
  uploaded_at: string
}

export interface QuoteVariant {
  id: number
  job_id: number
  tier: PricingTier
  markup_percentage: number
  subtotal: number
  tax_amount: number
  total_amount: number
  labor_charge_type: LaborChargeType
  total_labor_hours: number
  labor_rate_value: number  // Unified rate ($/hr, $/day, $/unit, etc.)
  labor_unit_type?: UnitType  // Unit for PER_UNIT charge types
  t_and_m_material_markup_percent?: number  // For TIME_AND_MATERIALS pricing
  total_labor_cost: number
  total_material_cost: number
  generated_method: string
  confidence_score?: number
  notes?: string
  created_at: string
  updated_at?: string
  variant_items?: QuoteVariantItem[]
}

export interface QuoteVariantItem {
  id: number
  quote_variant_id: number
  material_service_id?: number
  description: string
  quantity: number
  unit_of_measure: UnitType
  base_cost_per_unit: number
  markup_percentage: number
  price_per_unit: number
  total_cost: number
  total_price: number
  is_labor: boolean
  is_taxable: boolean
  category?: string
  source: string
  external_id?: string
  external_url?: string
  brand?: string
  model?: string
  image_url?: string
  thumbnail_url?: string
  order: number
  notes?: string
  created_at: string
  updated_at?: string
}

// ============================================
// INVOICES
// ============================================

export interface InvoiceItem {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_price: number
  total: number
  is_taxable: boolean
  notes?: string
}

export interface Invoice {
  id: number
  uuid: string
  contractor_id: number
  client_id: number
  job_id?: number
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  notes?: string
  terms?: string
  payment_instructions?: string
  created_at: string
  updated_at?: string
  client?: Client
  job?: Job
  items?: InvoiceItem[]
}

export interface InvoiceCreate {
  client_id: number
  job_id?: number
  invoice_number?: string
  status?: InvoiceStatus
  issue_date?: string
  due_date: string
  tax_rate?: number
  notes?: string
  terms?: string
  payment_instructions?: string
}

export interface InvoiceItemCreate {
  description: string
  quantity: number
  unit_price: number
  is_taxable?: boolean
  notes?: string
}

// ============================================
// MATERIALS & SERVICES
// ============================================

export interface MaterialService {
  id: number
  contractor_id?: number
  name: string
  description?: string
  category: string
  base_price: number
  unit_of_measure: UnitType
  is_taxable: boolean
  is_active: boolean
  brand?: string
  model?: string
  sku?: string
  external_url?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export interface MaterialServiceCreate {
  name: string
  description?: string
  category: string
  base_price: number
  unit_of_measure?: UnitType
  is_taxable?: boolean
  is_active?: boolean
  brand?: string
  model?: string
  sku?: string
  external_url?: string
  notes?: string
}

export interface MaterialPriceHistory {
  id: number
  material_service_id: number
  price: number
  source: string
  recorded_at: string
  notes?: string
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface DashboardStats {
  total_jobs: number
  active_jobs: number
  pending_quotes: number
  total_revenue: number
  monthly_revenue: number
  total_clients: number
  conversion_rate: number
  recent_activity: ActivityItem[]
}

export interface ActivityItem {
  id: number
  type: 'job_created' | 'quote_sent' | 'quote_accepted' | 'invoice_paid' | 'client_added'
  description: string
  timestamp: string
  related_id?: number
  related_type?: string
}

// ============================================
// PAGINATION & FILTERING
// ============================================

export interface PaginationParams {
  skip?: number
  limit?: number
}

export interface JobFilterParams extends PaginationParams {
  status?: JobStatus
  client_id?: number
  search?: string
  start_date?: string
  end_date?: string
}

export interface LeadFilterParams extends PaginationParams {
  status?: LeadStatus
  source?: LeadSource
  search?: string
}

export interface InvoiceFilterParams extends PaginationParams {
  status?: InvoiceStatus
  client_id?: number
  job_id?: number
  search?: string
}

// ============================================
// API RESPONSES
// ============================================

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface ApiError {
  detail: string
  status_code?: number
}

// ============================================
// MEASUREMENTS
// ============================================

export interface Measurements {
  items: MeasurementItem[]
  notes?: string
}

export interface MeasurementItem {
  type: string
  label?: string
  name?: string
  value?: number
  width?: number
  length?: number
  height?: number
  unit?: string
  notes?: string
}

// ============================================
// QUOTE GENERATION
// ============================================

export interface QuoteGenerationRequest {
  job_description: string
  location_zip_code?: string
  preferred_markup_tiers?: PricingTier[]
  include_labor?: boolean
  labor_rate_override?: number
  material_preferences?: Record<string, string>
}

export interface MaterialSuggestion {
  name: string
  description: string
  category: string
  estimated_quantity: number
  unit_of_measure: UnitType
  estimated_cost: number
  confidence: number
  source: string
  image_url?: string
  thumbnail_url?: string
}

export interface LaborEstimate {
  category: string
  estimated_hours: number
  hourly_rate: number
  total_cost: number
  skill_level: string
  confidence: number
}

export interface QuoteGenerationResponse {
  job_id: number
  material_suggestions: MaterialSuggestion[]
  labor_estimates: LaborEstimate[]
  quote_variants: QuoteVariant[]
  total_confidence: number
  generation_notes: string
  processing_time_seconds: number
}

// ============================================
// CONTRACTOR AI INTEGRATION
// ============================================

export interface ContractorAIConversation {
  id: number
  session_id: string
  contractor_id: number
  client_name?: string
  client_phone?: string
  status: 'active' | 'completed' | 'abandoned'
  started_at: string
  ended_at?: string
  summary?: string
}

export interface ContractorAIMessage {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// ============================================
// HELPER FUNCTIONS FOR ENUMS
// ============================================

export const getLaborChargeTypeLabel = (type: LaborChargeType): string => {
  const labels: Record<LaborChargeType, string> = {
    [LaborChargeType.HOURLY]: 'Hourly Rate',
    [LaborChargeType.PER_DAY]: 'Per Day',
    [LaborChargeType.CREW_PER_DAY]: 'Crew Per Day',
    [LaborChargeType.PER_UNIT]: 'Per Unit',
    [LaborChargeType.PER_ROOM]: 'Per Room',
    [LaborChargeType.PER_CUBIC_YARD]: 'Per Cubic Yard',
    [LaborChargeType.FLAT_RATE]: 'Flat Rate',
    [LaborChargeType.TIME_AND_MATERIALS]: 'Time & Materials'
  }
  return labels[type] || type
}

export const getUnitTypeLabel = (type: UnitType): string => {
  const labels: Record<UnitType, string> = {
    [UnitType.SQ_FT]: 'sq ft',
    [UnitType.LINEAR_FT]: 'linear ft',
    [UnitType.SHEET]: 'sheet',
    [UnitType.PIECE]: 'piece',
    [UnitType.WINDOW]: 'window',
    [UnitType.DOOR]: 'door',
    [UnitType.CABINET]: 'cabinet',
    [UnitType.SQUARE_100_SQFT]: 'square (100 sqft)',
    [UnitType.ROOM]: 'room',
    [UnitType.CUBIC_YARD]: 'cubic yard',
    [UnitType.EACH]: 'each',
    [UnitType.HOUR]: 'hour',
    [UnitType.DAY]: 'day',
    [UnitType.GALLON]: 'gallon',
    [UnitType.BOX]: 'box',
    [UnitType.BUNDLE]: 'bundle',
    [UnitType.ROLL]: 'roll',
    [UnitType.BAG]: 'bag',
    [UnitType.PALLET]: 'pallet'
  }
  return labels[type] || type
}

// Get the rate label suffix based on charge type
export const getRateLabelSuffix = (chargeType: LaborChargeType, unitType?: UnitType): string => {
  switch (chargeType) {
    case LaborChargeType.HOURLY:
      return '/hr'
    case LaborChargeType.PER_DAY:
    case LaborChargeType.CREW_PER_DAY:
      return '/day'
    case LaborChargeType.PER_ROOM:
      return '/room'
    case LaborChargeType.PER_CUBIC_YARD:
      return '/cu yd'
    case LaborChargeType.PER_UNIT:
      return unitType ? `/${getUnitTypeLabel(unitType)}` : '/unit'
    case LaborChargeType.FLAT_RATE:
      return ' (flat)'
    case LaborChargeType.TIME_AND_MATERIALS:
      return '/hr (T&M)'
    default:
      return ''
  }
}

// ============================================
// PROJECT FINANCIALS
// ============================================

export type CostItemStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'GC_APPROVED' | 'COMPLETED'
export type MaterialCategory = 'JOB_MATERIAL' | 'SITE_SERVICE'
export type FinancialPaymentMethod = 'CHECK' | 'WIRE' | 'ACH' | 'CREDIT_CARD' | 'CASH' | 'OTHER'

export interface ProjectCostItem {
  id: number
  project_id: number
  subcontractor_id?: number | null
  phase: string
  phase_order: number
  line_item: string
  status: CostItemStatus
  gc_cost: number
  client_price: number
  owed_to_sub: number
  paid: number
  order: number
  created_at: string
  updated_at?: string
}

export interface ProjectCostItemCreate {
  subcontractor_id?: number | null
  phase: string
  phase_order?: number
  line_item: string
  status?: CostItemStatus
  gc_cost?: number
  markup_pct?: number
  owed_to_sub?: number
  paid?: number
  order?: number
}

export type ProjectCostItemUpdate = Partial<ProjectCostItemCreate>

export interface ProjectMaterial {
  id: number
  project_id: number
  category: MaterialCategory
  item_name: string
  vendor?: string | null
  detailed_notes?: string | null
  cost: number
  client_price: number
  po_url?: string | null
  receipts?: { name: string; url: string }[]
  order: number
  created_at: string
  updated_at?: string
}

export interface ProjectMaterialCreate {
  category?: MaterialCategory
  item_name: string
  vendor?: string | null
  detailed_notes?: string | null
  cost?: number
  markup_pct?: number
  po_url?: string | null
  receipts?: { name: string; url: string }[]
  order?: number
}

export type ProjectMaterialUpdate = Partial<ProjectMaterialCreate>

export interface ProjectPayment {
  id: number
  project_id: number
  payment_method: FinancialPaymentMethod
  invoice_number?: string | null
  amount: number
  payment_date: string
  notes?: string | null
  created_at: string
}

export interface ProjectPaymentCreate {
  payment_method: FinancialPaymentMethod
  invoice_number?: string | null
  amount: number
  payment_date: string
  notes?: string | null
}

export interface ProjectFinancialSummary {
  total_project_value: number
  total_cost_items: number
  total_materials: number
  total_invoiced: number
  /** Sum of payments logged in the Payments Received sidebar */
  payments_logged_total?: number
  /** Sum of amount paid on linked QuickBooks invoices (0 if not connected or on error) */
  quickbooks_collected_total?: number
  /** Effective client cash received: max(logged, QuickBooks) */
  total_paid: number
  remaining_balance: number
  profit_to_date: number
  invoiced_pct: number
  collected_pct: number
  approved_co_total: number
  adjusted_budget: number
}
