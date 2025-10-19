/**
 * TypeScript types matching backend models
 * Generated to match ContractorBackend Python models
 */

// ============================================
// ENUMS
// ============================================

export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUOTED = "QUOTED",
  CONVERTED = "CONVERTED",
  REJECTED = "REJECTED",
  LOST = "LOST",
}

export enum LeadSource {
  WEBSITE_FORM = "WEBSITE_FORM",
  REFERRAL = "REFERRAL",
  PHONE_CALL = "PHONE_CALL",
  EMAIL = "EMAIL",
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  OTHER = "OTHER",
}

export enum ClientStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum JobStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  VIEWED = "VIEWED",
  CUSTOMER_MODIFIED = "CUSTOMER_MODIFIED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  INVOICED = "INVOICED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PENDING = "PENDING",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
  PARTIALLY_PAID = "PARTIALLY_PAID",
}

export enum PaymentMethod {
  CASH = "CASH",
  CHECK = "CHECK",
  CREDIT_CARD = "CREDIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  ONLINE_PAYMENT = "ONLINE_PAYMENT",
  OTHER = "OTHER",
}

export enum PricingTier {
  LOW = "LOW",
  MID = "MID",
  HIGH = "HIGH",
}

export enum AttachmentType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  PDF = "PDF",
  OTHER = "OTHER",
}

export enum AttachmentContext {
  LEAD_REQUEST = "LEAD_REQUEST",
  JOB = "JOB",
  INVOICE = "INVOICE",
  CLIENT = "CLIENT",
  SIGNATURE = "SIGNATURE",
}

// ============================================
// USER & CONTRACTOR
// ============================================

export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_contractor: boolean
  created_at: string
  updated_at?: string
}

export interface ContractorProfile {
  id: number
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
  default_labor_rate_per_hour: number
  default_zip_code?: string
  logo_url?: string
  website_url?: string
  created_at: string
  updated_at?: string
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
}

export interface LeadCreate {
  name: string
  email: string
  phone?: string
  address?: string
  project_type?: string
  description?: string
  source?: LeadSource
}

// ============================================
// CLIENTS
// ============================================

export interface Client {
  id: number
  contractor_id: number
  name: string
  email: string
  phone?: string
  address?: string
  company_name?: string
  billing_address?: string
  tax_id?: string
  status: ClientStatus
  notes?: string
  total_revenue: number
  total_jobs: number
  average_job_value?: number
  preferred_contact_method?: string
  payment_terms?: string
  discount_percentage?: number
  first_job_date?: string
  last_job_date?: string
  referral_source?: string
  created_at: string
  updated_at?: string
}

// ============================================
// JOBS / QUOTES
// ============================================

export interface Job {
  id: number
  contractor_id: number
  client_id?: number
  lead_id?: number
  job_number?: string
  title?: string
  client_name: string
  client_address?: string
  client_email?: string
  client_phone?: string
  job_description?: string
  project_type?: string
  location_zip_code?: string
  property_size?: string
  status: JobStatus
  quote_version: number
  selected_variant_tier?: string
  quote_expiration_date?: string
  quote_public_link?: string
  customer_viewed_at?: string
  customer_view_count: number
  customer_modifications_requested: boolean
  customer_modification_notes?: string
  accepted_at?: string
  accepted_total_amount?: number
  rejected_at?: string
  rejection_reason?: string
  scheduled_start_date?: string
  scheduled_end_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  estimated_duration_days?: number
  estimated_total?: number
  final_total?: number
  payment_terms?: string
  internal_notes?: string
  customer_notes?: string
  created_at: string
  updated_at?: string
  sent_at?: string
  items?: JobItem[]
  variants?: QuoteVariant[]
  attachments?: Attachment[]
  signature?: Signature
}

export interface JobItem {
  id: number
  job_id: number
  material_service_id?: number
  custom_description?: string
  quantity: number
  unit_of_measure?: string
  cost_per_unit: number
  markup_percentage: number
  is_taxable: boolean
  notes?: string
  order: number
  created_at: string
  updated_at?: string
}

export interface JobCreate {
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  project_type?: string
  job_description?: string
  location_zip_code?: string
}

// ============================================
// QUOTE VARIANTS
// ============================================

export interface QuoteVariant {
  id: number
  job_id: number
  tier: PricingTier
  markup_percentage: number
  subtotal: number
  tax_amount: number
  total_amount: number
  total_labor_hours: number
  labor_rate_per_hour: number
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
  unit_of_measure: string
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
  order: number
  notes?: string
  created_at: string
  updated_at?: string
}

// ============================================
// MATERIALS
// ============================================

export interface MaterialService {
  id: number
  name: string
  description?: string
  unit_of_measure?: string
  category?: string
  base_cost_per_unit: number
  is_labor: boolean
  supplier_info?: string
  last_cost_update?: string
  created_at: string
  updated_at?: string
}

export interface MaterialPriceHistory {
  id: number
  material_service_id: number
  price_per_unit: number
  unit_of_measure: string
  source: string
  source_location?: string
  external_id?: string
  external_url?: string
  vendor_name?: string
  brand?: string
  model?: string
  availability?: string
  rating?: number
  review_count?: number
  raw_data?: Record<string, any>
  confidence_score?: number
  is_current: boolean
  price_date: string
  created_at: string
}

// ============================================
// INVOICES
// ============================================

export interface Invoice {
  id: number
  contractor_id: number
  client_id: number
  job_id?: number
  invoice_number: string
  reference_number?: string
  title?: string
  description?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_percentage?: number
  discount_amount?: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: InvoiceStatus
  issue_date: string
  due_date: string
  paid_date?: string
  payment_method?: PaymentMethod
  payment_reference?: string
  payment_terms?: string
  notes?: string
  terms_and_conditions?: string
  last_reminder_sent?: string
  reminder_count: number
  created_at: string
  updated_at?: string
  sent_at?: string
  line_items?: InvoiceLineItem[]
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_of_measure?: string
  unit_price: number
  total_amount: number
  category?: string
  is_taxable: boolean
  order: number
  created_at: string
}

export interface Payment {
  id: number
  invoice_id: number
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference_number?: string
  notes?: string
  created_at: string
}

export interface InvoiceCreate {
  client_id: number
  job_id?: number
  title?: string
  description?: string
  due_date: string
  payment_terms?: string
  notes?: string
}

// ============================================
// ATTACHMENTS
// ============================================

export interface Attachment {
  id: number
  lead_id?: number
  job_id?: number
  invoice_id?: number
  client_id?: number
  file_name: string
  file_path: string
  file_size?: number
  file_type: AttachmentType
  mime_type?: string
  context: AttachmentContext
  description?: string
  storage_provider: string
  public_url?: string
  thumbnail_url?: string
  uploaded_by?: string
  order: number
  created_at: string
  updated_at?: string
}

// ============================================
// SIGNATURES
// ============================================

export interface Signature {
  id: number
  job_id: number
  signature_data: string
  signature_image_url?: string
  signer_name: string
  signer_email?: string
  signer_ip_address?: string
  accepted_terms: boolean
  accepted_total_amount?: string
  quote_version?: number
  signed_at: string
  user_agent?: string
  is_verified: boolean
  verification_token?: string
  verified_at?: string
  additional_notes?: string
  created_at: string
}

export interface SignatureCreate {
  job_id: number
  signature_data: string
  signer_name: string
  signer_email?: string
  accepted_terms: boolean
  accepted_total_amount?: string
}

// ============================================
// QUOTE SNAPSHOTS
// ============================================

export interface QuoteSnapshot {
  id: number
  job_id: number
  version_number: number
  snapshot_data: Record<string, any>
  generated_at: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

export interface ErrorResponse {
  detail: string
  status_code: number
}

// ============================================
// FORM DATA TYPES (for customer-facing forms)
// ============================================

export interface CustomerQuoteRequestForm {
  name: string
  email: string
  phone: string
  address: string
  projectType: string
  description: string
  selectedProducts?: number[]
  files?: File[]
}

export interface QuoteAcceptanceForm {
  signature: string
  signer_name: string
  signer_email: string
  accepted_terms: boolean
  selected_tier?: PricingTier
}

export interface ProductReplacementRequest {
  job_id: number
  original_item_id: number
  suggested_material_id: number
  notes?: string
}

