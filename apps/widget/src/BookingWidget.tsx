import React, { useState, useCallback } from 'react'
import { styles } from './styles'

type Step = 1 | 2 | 3 | 'success' | 'error'

interface FormData {
  serviceType: string
  urgency: 'emergency' | 'soon' | 'flexible'
  preferredDate: string
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

const INITIAL_FORM: FormData = {
  serviceType: '',
  urgency: 'flexible',
  preferredDate: '',
  preferredTimeOfDay: 'flexible',
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

const SERVICE_TYPES = [
  'AC Repair',
  'Heating Repair',
  'AC Installation',
  'Heating Installation',
  'Maintenance / Tune-Up',
  'Air Quality',
  'Duct Cleaning',
  'Emergency Service',
  'Other',
]

interface Props {
  orgSlug: string
  apiBase: string
}

export function BookingWidget({ orgSlug, apiBase }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)

  const set = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  function handleOpen() {
    setOpen(true)
    setStep(1)
    setForm(INITIAL_FORM)
  }

  function handleClose() {
    setOpen(false)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/bookings/widget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          serviceType: form.serviceType,
          urgency: form.urgency,
          preferredDate: form.preferredDate || null,
          preferredTimeOfDay: form.preferredTimeOfDay,
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          address: form.address,
          notes: form.notes || null,
        }),
      })
      if (res.ok) {
        setStep('success')
      } else {
        setStep('error')
      }
    } catch {
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{styles}</style>

      {/* Floating trigger button */}
      {!open && (
        <button className="fp-fab" onClick={handleOpen} aria-label="Book a service">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Book Service</span>
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div className="fp-overlay" onClick={handleClose}>
          <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="fp-header">
              <div className="fp-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.92 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Request Service
              </div>
              <button className="fp-close" onClick={handleClose} aria-label="Close">✕</button>
            </div>

            {/* Step indicator */}
            {(step === 1 || step === 2 || step === 3) && (
              <div className="fp-steps">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`fp-step ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                    {step > s ? '✓' : s}
                  </div>
                ))}
                <div className="fp-step-line" />
              </div>
            )}

            {/* Body */}
            <div className="fp-body">
              {step === 1 && <Step1 form={form} set={set} onNext={() => setStep(2)} />}
              {step === 2 && <Step2 form={form} set={set} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
              {step === 3 && <Step3 form={form} set={set} onBack={() => setStep(2)} onSubmit={handleSubmit} loading={loading} />}
              {step === 'success' && <SuccessScreen onClose={handleClose} />}
              {step === 'error' && <ErrorScreen onRetry={() => setStep(3)} onClose={handleClose} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 1: Service type + urgency
// ──────────────────────────────────────────────────────────────────────────────

function Step1({ form, set, onNext }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void; onNext: () => void }) {
  const canProceed = form.serviceType.trim().length > 0

  return (
    <div className="fp-step-content">
      <h3 className="fp-step-title">What service do you need?</h3>

      <div className="fp-field">
        <label className="fp-label">Service Type *</label>
        <select
          className="fp-select"
          value={form.serviceType}
          onChange={(e) => set('serviceType', e.target.value)}
        >
          <option value="">Select a service...</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="fp-field">
        <label className="fp-label">How urgent is this?</label>
        <div className="fp-radio-group">
          {([
            { value: 'emergency', label: '🚨 Emergency', sub: 'Need help ASAP' },
            { value: 'soon', label: '⚡ Soon', sub: 'Within a few days' },
            { value: 'flexible', label: '📅 Flexible', sub: 'No rush' },
          ] as const).map(({ value, label, sub }) => (
            <label key={value} className={`fp-radio-card ${form.urgency === value ? 'selected' : ''}`}>
              <input
                type="radio"
                name="urgency"
                value={value}
                checked={form.urgency === value}
                onChange={() => set('urgency', value)}
              />
              <span className="fp-radio-label">{label}</span>
              <span className="fp-radio-sub">{sub}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="fp-btn fp-btn-primary" disabled={!canProceed} onClick={onNext}>
        Next →
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 2: Preferred date/time
// ──────────────────────────────────────────────────────────────────────────────

function Step2({ form, set, onBack, onNext }: { form: FormData; set: <K extends keyof FormData>(k: K, v: FormData[K]) => void; onBack: () => void; onNext: () => void }) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fp-step-content">
      <h3 className="fp-step-title">When works for you?</h3>

      <div className="fp-field">
        <label className="fp-label">Preferred Date (optional)</label>
        <input
          type="date"
          className="fp-input"
          min={today}
          value={form.preferredDate}
          onChange={(e) => set('preferredDate', e.target.value)}
        />
      </div>

      <div className="fp-field">
        <label className="fp-label">Preferred Time of Day</label>
        <div className="fp-time-grid">
          {([
            { value: 'morning', label: '🌅 Morning', sub: '8am – 12pm' },
            { value: 'afternoon', label: '☀️ Afternoon', sub: '12pm – 5pm' },
            { value: 'evening', label: '🌙 Evening', sub: '5pm – 8pm' },
            { value: 'flexible', label: '🔄 Flexible', sub: 'Any time' },
          ] as const).map(({ value, label, sub }) => (
            <label key={value} className={`fp-time-card ${form.preferredTimeOfDay === value ? 'selected' : ''}`}>
              <input
                type="radio"
                name="timeOfDay"
                value={value}
                checked={form.preferredTimeOfDay === value}
                onChange={() => set('preferredTimeOfDay', value)}
              />
              <span className="fp-radio-label">{label}</span>
              <span className="fp-radio-sub">{sub}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="fp-btn-row">
        <button className="fp-btn fp-btn-ghost" onClick={onBack}>← Back</button>
        <button className="fp-btn fp-btn-primary" onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 3: Contact info
// ──────────────────────────────────────────────────────────────────────────────

function Step3({
  form,
  set,
  onBack,
  onSubmit,
  loading,
}: {
  form: FormData
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void
  onBack: () => void
  onSubmit: () => void
  loading: boolean
}) {
  const canSubmit =
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 7 &&
    form.address.trim().length >= 5

  return (
    <div className="fp-step-content">
      <h3 className="fp-step-title">Your contact details</h3>

      <div className="fp-field">
        <label className="fp-label">Full Name *</label>
        <input
          className="fp-input"
          type="text"
          placeholder="Jane Smith"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="fp-field">
        <label className="fp-label">Phone Number *</label>
        <input
          className="fp-input"
          type="tel"
          placeholder="(555) 000-0000"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
      </div>

      <div className="fp-field">
        <label className="fp-label">Email (optional)</label>
        <input
          className="fp-input"
          type="email"
          placeholder="jane@example.com"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>

      <div className="fp-field">
        <label className="fp-label">Service Address *</label>
        <input
          className="fp-input"
          type="text"
          placeholder="123 Main St, City, ST 00000"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>

      <div className="fp-field">
        <label className="fp-label">Notes (optional)</label>
        <textarea
          className="fp-textarea"
          placeholder="Anything we should know..."
          rows={3}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className="fp-btn-row">
        <button className="fp-btn fp-btn-ghost" onClick={onBack} disabled={loading}>← Back</button>
        <button
          className="fp-btn fp-btn-primary"
          disabled={!canSubmit || loading}
          onClick={onSubmit}
        >
          {loading ? 'Sending…' : 'Request Service ✓'}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Success / Error screens
// ──────────────────────────────────────────────────────────────────────────────

function SuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fp-result">
      <div className="fp-result-icon fp-result-icon-success">✓</div>
      <h3 className="fp-result-title">Request Received!</h3>
      <p className="fp-result-body">
        Thanks! We'll review your request and contact you shortly to confirm your appointment.
      </p>
      <button className="fp-btn fp-btn-primary" onClick={onClose}>Done</button>
    </div>
  )
}

function ErrorScreen({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div className="fp-result">
      <div className="fp-result-icon fp-result-icon-error">!</div>
      <h3 className="fp-result-title">Something went wrong</h3>
      <p className="fp-result-body">
        We couldn't submit your request. Please try again or call us directly.
      </p>
      <div className="fp-btn-row">
        <button className="fp-btn fp-btn-ghost" onClick={onClose}>Close</button>
        <button className="fp-btn fp-btn-primary" onClick={onRetry}>Try Again</button>
      </div>
    </div>
  )
}
