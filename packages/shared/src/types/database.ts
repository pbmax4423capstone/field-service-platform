import type {
  BookingStatus,
  CallOutcome,
  ChatStatus,
  EquipmentType,
  EstimateStatus,
  InvoiceStatus,
  JobStatus,
  NotificationChannel,
  NotificationEvent,
  PaymentMethod,
  PaymentStatus,
  PlanTier,
  PriceBookCategory,
  SocialPlatform,
  SocialPostStatus,
  UserRole,
  WebsiteTemplate,
} from './enums'

// ---------------------------------------------------------------------------
// Core multi-tenant tables
// ---------------------------------------------------------------------------

export interface Organization {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  service_area_zips: string[]
  business_hours: BusinessHours | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  website_template: WebsiteTemplate | null
  website_domain: string | null
  google_review_url: string | null
  plan_tier: PlanTier
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  twilio_phone_number: string | null
  sendgrid_sender_email: string | null
  ai_chat_enabled: boolean
  ai_voice_enabled: boolean
  ai_voice_hours: VoiceHours | null
  ai_voice_forwarding_number: string | null
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  monday: DayHours | null
  tuesday: DayHours | null
  wednesday: DayHours | null
  thursday: DayHours | null
  friday: DayHours | null
  saturday: DayHours | null
  sunday: DayHours | null
}

export interface DayHours {
  open: string  // "08:00"
  close: string // "17:00"
}

export interface VoiceHours {
  answer_after_hours: boolean
  answer_weekends: boolean
  custom_schedule: BusinessHours | null
}

export interface User {
  id: string
  organization_id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserRoleRecord {
  id: string
  user_id: string
  organization_id: string
  role: UserRole
  created_at: string
}

// ---------------------------------------------------------------------------
// Customer tables
// ---------------------------------------------------------------------------

export interface Customer {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  phone_alt: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface CustomerAddress {
  id: string
  customer_id: string
  organization_id: string
  label: string | null  // "Home", "Rental Property"
  street: string
  city: string
  state: string
  zip: string
  is_primary: boolean
  access_notes: string | null
  created_at: string
}

export interface CustomerEquipment {
  id: string
  customer_id: string
  address_id: string
  organization_id: string
  equipment_type: EquipmentType
  make: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  warranty_expiry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Job tables
// ---------------------------------------------------------------------------

export interface Job {
  id: string
  organization_id: string
  customer_id: string
  address_id: string
  technician_id: string | null
  status: JobStatus
  scheduled_start: string
  scheduled_end: string | null
  actual_start: string | null
  actual_end: string | null
  title: string
  description: string | null
  internal_notes: string | null
  invoice_id: string | null
  estimate_id: string | null
  booking_id: string | null
  created_at: string
  updated_at: string
}

export interface JobLineItem {
  id: string
  job_id: string
  organization_id: string
  price_book_item_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  taxable: boolean
  created_at: string
}

export interface JobPhoto {
  id: string
  job_id: string
  organization_id: string
  uploaded_by: string
  url: string
  caption: string | null
  photo_type: 'before' | 'after' | 'other'
  created_at: string
}

export interface JobNote {
  id: string
  job_id: string
  organization_id: string
  author_id: string
  content: string
  created_at: string
}

export interface JobStatusHistory {
  id: string
  job_id: string
  organization_id: string
  changed_by: string
  from_status: JobStatus | null
  to_status: JobStatus
  note: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Estimate & Invoice tables
// ---------------------------------------------------------------------------

export interface Estimate {
  id: string
  organization_id: string
  customer_id: string
  address_id: string | null
  status: EstimateStatus
  title: string
  notes: string | null
  terms: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  valid_until: string | null
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface EstimateLineItem {
  id: string
  estimate_id: string
  organization_id: string
  price_book_item_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  taxable: boolean
  sort_order: number
  created_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  customer_id: string
  job_id: string | null
  estimate_id: string | null
  status: InvoiceStatus
  invoice_number: string
  title: string
  notes: string | null
  terms: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  due_date: string | null
  sent_at: string | null
  viewed_at: string | null
  paid_at: string | null
  public_token: string  // for customer-facing payment page
  created_by: string
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  organization_id: string
  price_book_item_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  taxable: boolean
  sort_order: number
  created_at: string
}

export interface Payment {
  id: string
  organization_id: string
  invoice_id: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  notes: string | null
  collected_by: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Price Book
// ---------------------------------------------------------------------------

export interface PriceBook {
  id: string
  organization_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface PriceBookItem {
  id: string
  price_book_id: string
  organization_id: string
  name: string
  description: string | null
  category: PriceBookCategory
  unit_price: number
  cost: number | null
  taxable: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface NotificationPreference {
  id: string
  organization_id: string
  event: NotificationEvent
  channel: NotificationChannel
  is_enabled: boolean
  template_sms: string | null
  template_email_subject: string | null
  template_email_body: string | null
  reminder_offset_minutes: number | null  // e.g. 1440 = 24h before
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id: string
  organization_id: string
  customer_id: string | null
  job_id: string | null
  event: NotificationEvent
  channel: 'sms' | 'email'
  recipient: string  // phone or email
  message: string
  status: 'sent' | 'delivered' | 'failed' | 'bounced'
  provider_message_id: string | null
  error_message: string | null
  created_at: string
}

export interface ReviewRequest {
  id: string
  organization_id: string
  customer_id: string
  job_id: string
  sent_at: string | null
  channel: 'sms' | 'email'
  review_url: string
  clicked_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Bookings & Leads
// ---------------------------------------------------------------------------

export interface Booking {
  id: string
  organization_id: string
  customer_id: string | null
  status: BookingStatus
  service_requested: string
  preferred_date: string | null
  preferred_time_of_day: 'morning' | 'afternoon' | 'evening' | 'flexible' | null
  urgency: 'emergency' | 'soon' | 'flexible' | null
  customer_name: string
  customer_phone: string
  customer_email: string | null
  address: string
  notes: string | null
  source: 'widget' | 'chat' | 'voice' | 'manual'
  job_id: string | null  // set when booking is converted to a job
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  organization_id: string
  name: string
  phone: string
  email: string | null
  message: string | null
  source: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// AI Agents
// ---------------------------------------------------------------------------

export interface ChatConversation {
  id: string
  organization_id: string
  customer_id: string | null
  status: ChatStatus
  messages: ChatMessage[]
  booking_id: string | null
  visitor_identifier: string | null  // anonymous session ID
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface VoiceCall {
  id: string
  organization_id: string
  twilio_call_sid: string
  caller_number: string
  duration_seconds: number | null
  outcome: CallOutcome
  transcript: string | null
  booking_id: string | null
  recording_url: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Social Media
// ---------------------------------------------------------------------------

export interface SocialAccount {
  id: string
  organization_id: string
  platform: SocialPlatform
  account_name: string
  account_id: string
  access_token_encrypted: string  // stored encrypted
  token_expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface SocialPost {
  id: string
  organization_id: string
  platforms: SocialPlatform[]
  content: string
  media_urls: string[]
  status: SocialPostStatus
  scheduled_for: string | null
  published_at: string | null
  platform_post_ids: Record<string, string>  // platform → post ID
  error_message: string | null
  created_by: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Database helper types
// ---------------------------------------------------------------------------

export type Tables = {
  organizations: Organization
  users: User
  user_roles: UserRoleRecord
  customers: Customer
  customer_addresses: CustomerAddress
  customer_equipment: CustomerEquipment
  jobs: Job
  job_line_items: JobLineItem
  job_photos: JobPhoto
  job_notes: JobNote
  job_status_history: JobStatusHistory
  estimates: Estimate
  estimate_line_items: EstimateLineItem
  invoices: Invoice
  invoice_line_items: InvoiceLineItem
  payments: Payment
  price_books: PriceBook
  price_book_items: PriceBookItem
  notification_preferences: NotificationPreference
  notification_logs: NotificationLog
  review_requests: ReviewRequest
  bookings: Booking
  leads: Lead
  chat_conversations: ChatConversation
  voice_calls: VoiceCall
  social_accounts: SocialAccount
  social_posts: SocialPost
}

export type TableName = keyof Tables

// Utility types for insert/update operations
export type Insert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type Update<T> = Partial<Omit<T, 'id' | 'organization_id' | 'created_at'>>
