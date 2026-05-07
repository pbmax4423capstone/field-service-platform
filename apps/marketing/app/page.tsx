import Link from 'next/link'
import {
  MessageSquare,
  Phone,
  FileText,
  Smartphone,
  Calendar,
  Bell,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  Star,
  ArrowRight,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat Agent',
    description:
      'Claude-powered assistant with full business context. Ask about outstanding invoices, today\'s jobs, or customer history in plain English.',
  },
  {
    icon: Phone,
    title: 'AI Voice Agent',
    description:
      'Inbound calls handled automatically with Twilio + Deepgram. Books appointments, answers questions, and captures leads 24/7.',
  },
  {
    icon: FileText,
    title: 'Invoicing & Payments',
    description:
      'Create invoices in seconds, send payment links via SMS/email, and collect card payments through Stripe. Auto-reconciled.',
  },
  {
    icon: Smartphone,
    title: 'Technician Mobile App',
    description:
      'Native iOS & Android app for field techs. Status updates, photo capture, customer info, and navigation — all offline-ready.',
  },
  {
    icon: Calendar,
    title: 'Booking Widget',
    description:
      'Embeddable booking form for your website. Customers self-schedule, you get notified, and bookings flow straight into the dashboard.',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description:
      'Automated SMS and email reminders for appointments, en-route alerts, and post-job review requests. Respect customer preferences.',
  },
  {
    icon: ClipboardList,
    title: 'Estimates & Proposals',
    description:
      'Build detailed estimates with line items from your price book. One click converts accepted estimates into invoices.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Revenue by period, job completion rates, technician performance, and customer lifetime value — all in one dashboard.',
  },
]

const testimonials = [
  {
    initials: 'MR',
    name: 'Mike Reynolds',
    role: 'Owner, Reynolds HVAC',
    quote:
      'FieldPro cut our invoice-to-payment time from 18 days to 3. The Stripe integration just works and our customers love the text payment links.',
    color: 'bg-blue-600',
  },
  {
    initials: 'JS',
    name: 'Jennifer Santos',
    role: 'Operations Manager, Cool Breeze Services',
    quote:
      'The AI voice agent was a game-changer. It handles after-hours calls and books appointments automatically. We haven\'t missed a lead since.',
    color: 'bg-emerald-600',
  },
  {
    initials: 'DK',
    name: 'David Kim',
    role: 'CEO, Premier Climate Control',
    quote:
      'Onboarding our 12 techs took one afternoon. The mobile app is clean, the status updates are instant, and dispatch has never been smoother.',
    color: 'bg-violet-600',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="bg-gray-900 pt-20 pb-28 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">AI-powered field service management</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Run your HVAC business
            <br />
            <span className="text-blue-400">like a Fortune 500</span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            FieldPro gives HVAC contractors an AI chat agent, voice answering, automated invoicing,
            and a technician mobile app — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="http://localhost:3000/signup"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors border border-gray-700"
            >
              See All Features
            </Link>
          </div>

          <p className="text-gray-500 text-sm mt-6">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-gray-50 border-y border-gray-200 py-5">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            ['500+', 'Contractors'],
            ['98%', 'Uptime SLA'],
            ['< 3 days', 'Avg. Payment Time'],
            ['4.9 / 5', 'Customer Rating'],
          ].map(([stat, label]) => (
            <div key={label}>
              <p className="text-2xl font-bold text-gray-900">{stat}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to scale</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Stop juggling spreadsheets, phone calls, and paper invoices. FieldPro brings it all
              together with modern AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all group"
              >
                <div className="w-11 h-11 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              Explore all features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-500">Scale up or down as your team grows. No surprise fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="font-bold text-lg text-gray-900 mb-1">Starter</h3>
              <p className="text-sm text-gray-500 mb-6">Perfect for solo operators and small shops</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">$49</span>
                <span className="text-gray-500 mb-1.5">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Up to 2 technicians',
                  'Jobs, customers, invoices',
                  'Booking widget',
                  'SMS & email notifications',
                  'Mobile app access',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="http://localhost:3000/signup"
                className="block text-center bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Pro — featured */}
            <div className="bg-blue-600 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
              </div>
              <h3 className="font-bold text-lg text-white mb-1">Pro</h3>
              <p className="text-sm text-blue-200 mb-6">For growing teams that need AI superpowers</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">$99</span>
                <span className="text-blue-200 mb-1.5">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited technicians',
                  'Everything in Starter',
                  'AI Chat Agent (Claude)',
                  'AI Voice Agent (24/7)',
                  'Stripe payments & invoicing',
                  'Estimates & price book',
                  'Social media scheduling',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckCircle2 className="w-4 h-4 text-blue-200 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="http://localhost:3000/signup"
                className="block text-center bg-white hover:bg-blue-50 text-blue-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Start Free Trial
              </a>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="font-bold text-lg text-gray-900 mb-1">Enterprise</h3>
              <p className="text-sm text-gray-500 mb-6">For multi-location and franchise operations</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Pro',
                  'Multi-location support',
                  'Custom integrations',
                  'Dedicated account manager',
                  'SLA guarantee',
                  'SSO / SAML',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:sales@fieldpro.app"
                className="block text-center bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loved by contractors everywhere</h2>
            <p className="text-xl text-gray-500">Join 500+ HVAC businesses that run on FieldPro</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ initials, name, role, quote, color }) => (
              <div key={name} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 text-sm">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center shrink-0`}>
                    <span className="text-white text-sm font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to modernize your business?</h2>
          <p className="text-xl text-blue-100 mb-10">
            Start your free 14-day trial today. No credit card required.
          </p>
          <a
            href="http://localhost:3000/signup"
            className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 font-bold px-10 py-4 rounded-xl text-lg transition-colors"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  )
}
