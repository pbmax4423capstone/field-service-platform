export const JOB_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  dispatched: 'Dispatched',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: '#3B82F6',  // blue
  dispatched: '#F59E0B', // amber
  en_route: '#8B5CF6',  // violet
  in_progress: '#F97316', // orange
  completed: '#10B981', // green
  cancelled: '#6B7280', // gray
  no_show: '#EF4444',   // red
}

// Valid job status transitions
export const JOB_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['dispatched', 'cancelled'],
  dispatched: ['en_route', 'cancelled'],
  en_route: ['in_progress', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: ['scheduled'],
}

export const ESTIMATE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  viewed: '#8B5CF6',
  paid: '#10B981',
  overdue: '#EF4444',
  void: '#9CA3AF',
}

export const PRICE_BOOK_CATEGORIES = [
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'installation', label: 'Installation' },
  { value: 'parts', label: 'Parts' },
  { value: 'other', label: 'Other' },
] as const

export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  air_conditioner: 'Air Conditioner',
  furnace: 'Furnace',
  heat_pump: 'Heat Pump',
  air_handler: 'Air Handler',
  boiler: 'Boiler',
  mini_split: 'Mini Split',
  thermostat: 'Thermostat',
  other: 'Other',
}

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const

export const DEFAULT_TAX_RATE = 0.0 // contractors configure their own

export const NOTIFICATION_EVENTS = [
  { value: 'appointment_reminder_24h', label: '24hr Appointment Reminder' },
  { value: 'appointment_reminder_2h', label: '2hr Appointment Reminder' },
  { value: 'appointment_confirmed', label: 'Appointment Confirmed' },
  { value: 'technician_en_route', label: 'Technician En Route' },
  { value: 'job_completed', label: 'Job Completed' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'invoice_paid', label: 'Invoice Paid' },
  { value: 'review_request', label: 'Review Request' },
  { value: 'booking_confirmed', label: 'Booking Confirmed' },
] as const
