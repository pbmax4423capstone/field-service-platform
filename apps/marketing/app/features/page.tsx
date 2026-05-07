import {
  MessageSquare,
  Phone,
  FileText,
  Smartphone,
  Calendar,
  Bell,
  ClipboardList,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Globe,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

const featureSections = [
  {
    icon: MessageSquare,
    title: 'AI Chat Agent',
    subtitle: 'Claude-powered business intelligence',
    description:
      'Ask questions about your business in plain English. The AI Chat Agent has full context of your organisation — outstanding invoices, today\'s job schedule, customer history, and revenue metrics. It responds with actionable insights and can retrieve specific job or customer details on demand.',
    bullets: [
      'Powered by Anthropic Claude 3.5 Sonnet',
      'Persistent conversations with full history',
      'Tool use: drill into specific jobs and customers',
      'Streaming responses for instant feedback',
      'Context-aware — knows your org\'s data',
    ],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Phone,
    title: 'AI Voice Agent',
    subtitle: 'Never miss a call, 24 hours a day',
    description:
      'The AI Voice Agent answers inbound calls using Twilio and Deepgram speech recognition. It understands the caller\'s request, answers questions about your services, and books appointments directly into your system — all without human intervention.',
    bullets: [
      'Deepgram Nova-2 speech-to-text',
      'Claude-3.5-Sonnet for intent handling',
      'Deepgram Aura TTS for natural responses',
      'Booking creation from voice conversations',
      'Complete call logs with transcripts',
    ],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: FileText,
    title: 'Invoicing & Payments',
    subtitle: 'Get paid faster with Stripe',
    description:
      'Create professional invoices with line items from your price book. Send a payment link via SMS or email — customers pay with any card in seconds. Payments auto-reconcile in your dashboard. Generate PDF invoices for any job.',
    bullets: [
      'Stripe Connect for instant payouts',
      'One-click payment link via SMS/email',
      'PDF invoice generation',
      'Payment history & balance tracking',
      'Stripe webhook auto-reconciliation',
    ],
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: Smartphone,
    title: 'Technician Mobile App',
    subtitle: 'Everything your techs need in the field',
    description:
      'A native iOS and Android app built with Expo. Technicians see their daily jobs, customer info, and can update statuses, add notes, and capture before/after photos directly from the job site. Push notifications keep everyone in sync.',
    bullets: [
      'Today\'s jobs with tap-to-navigate',
      'Real-time status updates',
      'Before/after photo capture',
      'Customer history and equipment',
      'Expo push notifications',
    ],
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Calendar,
    title: 'Booking Widget',
    subtitle: 'Self-service scheduling for customers',
    description:
      'Embed a booking form on any website with a single script tag. Customers choose service type, urgency, and preferred time. Submissions flow directly into your bookings queue and email you instantly.',
    bullets: [
      'One-line embed: <script data-org-slug="...">',
      'Three-step guided form',
      'Urgency classification',
      'Instant contractor notification',
      'Finds or creates customer records',
    ],
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    subtitle: 'Automated, multi-channel communication',
    description:
      'FieldPro sends the right message at the right time via SMS (Twilio) and email (SendGrid). Appointment reminders, en-route alerts, and post-job review requests — all configurable per organization. Every send is logged.',
    bullets: [
      '24-hour and 2-hour appointment reminders',
      'En-route customer alert',
      'Post-job review request (Google)',
      'SMS via Twilio + email via SendGrid',
      'Per-org channel preferences',
    ],
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: ClipboardList,
    title: 'Estimates & Proposals',
    subtitle: 'Win more jobs with professional proposals',
    description:
      'Create detailed estimates with dynamic line items pulled from your price book. Mark estimates as sent, track acceptance, and convert approved estimates into invoices in one click — no re-entry required.',
    bullets: [
      'Dynamic line items with quantity & price',
      'Valid-until date tracking',
      'One-click invoice conversion',
      'Status pipeline: draft → sent → accepted',
      'Customer email delivery',
    ],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    subtitle: 'Data-driven decisions for your business',
    description:
      'A live dashboard shows today\'s jobs, outstanding revenue, upcoming appointments, and recent activity. See which technicians perform best, which customers generate the most value, and where your revenue comes from.',
    bullets: [
      'Revenue and job completion metrics',
      'Today\'s schedule at a glance',
      'Outstanding invoice tracking',
      'Customer lifetime value',
      'Activity feed with real-time updates',
    ],
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="bg-gray-900 pt-16 pb-20 px-6 text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4">Built for field service, powered by AI</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Every feature in FieldPro was designed for HVAC contractors who need tools that actually
          work in the real world.
        </p>
        <a
          href="http://localhost:3000/signup"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      {/* Quick highlights */}
      <section className="bg-white border-b border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            { icon: Zap, label: 'AI-first platform' },
            { icon: Shield, label: 'SOC-2 compliant infrastructure' },
            { icon: Globe, label: 'Works on any device' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-gray-700">
              <Icon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature sections */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          {featureSections.map(({ icon: Icon, title, subtitle, description, bullets, color, bg }) => (
            <div key={title} className="grid grid-cols-1 md:grid-cols-5 gap-10 items-start">
              <div className="md:col-span-3">
                <div className={`inline-flex items-center gap-2.5 ${bg} rounded-xl px-4 py-2 mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className={`text-sm font-semibold ${color}`}>{subtitle}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{description}</p>
                <a
                  href="http://localhost:3000/signup"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                >
                  Try it free <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="md:col-span-2">
                <ul className="space-y-3">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to try all of these features?</h2>
        <p className="text-blue-100 mb-8">14-day free trial. No credit card required.</p>
        <a
          href="http://localhost:3000/signup"
          className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </a>
      </section>

      <Footer />
    </div>
  )
}
