export type UserRole = 'admin' | 'technician' | 'office_staff'

export type JobStatus =
  | 'scheduled'
  | 'dispatched'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void'

export type PaymentMethod = 'credit_card' | 'cash' | 'check' | 'ach' | 'other'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export type NotificationChannel = 'sms' | 'email' | 'both'

export type NotificationEvent =
  | 'appointment_reminder_24h'
  | 'appointment_reminder_2h'
  | 'appointment_confirmed'
  | 'technician_en_route'
  | 'job_completed'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'review_request'
  | 'booking_confirmed'

export type BookingStatus = 'pending' | 'approved' | 'scheduled' | 'declined'

export type ChatStatus = 'active' | 'booking_created' | 'handed_off' | 'closed'

export type CallOutcome = 'booking_created' | 'handed_off' | 'voicemail' | 'no_answer' | 'other'

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok'

export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

export type PriceBookCategory = 'repair' | 'maintenance' | 'installation' | 'parts' | 'other'

export type EquipmentType =
  | 'air_conditioner'
  | 'furnace'
  | 'heat_pump'
  | 'air_handler'
  | 'boiler'
  | 'mini_split'
  | 'thermostat'
  | 'other'

export type PlanTier = 'starter' | 'professional' | 'enterprise'

export type WebsiteTemplate = 'starter' | 'professional' | 'business'
