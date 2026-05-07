import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'Perfect for solo operators and small shops just getting started.',
    cta: 'Get Started',
    ctaHref: 'http://localhost:3000/signup',
    featured: false,
    features: [
      'Up to 2 technicians',
      'Jobs, customers & CRM',
      'Invoice creation & PDF export',
      'Booking widget (1 embed)',
      'SMS & email notifications',
      'Technician mobile app',
      'Price book',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/mo',
    description: 'For growing teams that need AI superpowers and deeper automation.',
    cta: 'Start Free Trial',
    ctaHref: 'http://localhost:3000/signup',
    featured: true,
    features: [
      'Unlimited technicians',
      'Everything in Starter',
      'AI Chat Agent (Claude-powered)',
      'AI Voice Agent (24/7 call handling)',
      'Stripe Connect payments',
      'Estimates & conversions',
      'Social media post scheduling',
      'Advanced analytics',
      'Priority email & chat support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Tailored solutions for multi-location and franchise operations.',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@fieldpro.app',
    featured: false,
    features: [
      'Everything in Pro',
      'Multi-location management',
      'Custom API integrations',
      'Dedicated account manager',
      '99.9% SLA guarantee',
      'SSO / SAML authentication',
      'Custom reporting',
      'White-label option',
    ],
  },
]

const faq = [
  {
    q: 'Can I change plans at any time?',
    a: 'Yes — upgrade or downgrade at any time. Changes take effect on your next billing cycle.',
  },
  {
    q: 'Is there a free trial?',
    a: 'All plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards via Stripe. Enterprise plans can be invoiced quarterly or annually.',
  },
  {
    q: 'Does FieldPro take a percentage of my payments?',
    a: 'No. We charge a flat monthly fee. Stripe applies their standard processing fees (2.9% + 30¢), which go directly to Stripe — we don\'t take a cut.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'You can export all your data at any time. After cancellation your account is read-only for 30 days, then permanently deleted.',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="bg-gray-900 pt-16 pb-20 px-6 text-center">
        <h1 className="text-5xl font-extrabold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto">
          One flat monthly fee. No per-job charges. No hidden costs.
        </p>
      </section>

      {/* Plans */}
      <section className="py-16 px-6 -mt-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(({ name, price, period, description, cta, ctaHref, featured, features }) => (
              <div
                key={name}
                className={
                  featured
                    ? 'bg-blue-600 rounded-2xl p-8 relative ring-2 ring-blue-500 ring-offset-2'
                    : 'bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow'
                }
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}
                <h2 className={`font-bold text-xl mb-1 ${featured ? 'text-white' : 'text-gray-900'}`}>{name}</h2>
                <p className={`text-sm mb-6 ${featured ? 'text-blue-200' : 'text-gray-500'}`}>{description}</p>
                <div className="flex items-end gap-1 mb-8">
                  <span className={`text-4xl font-extrabold ${featured ? 'text-white' : 'text-gray-900'}`}>{price}</span>
                  {period && <span className={`mb-1.5 ${featured ? 'text-blue-200' : 'text-gray-500'}`}>{period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${featured ? 'text-white' : 'text-gray-700'}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${featured ? 'text-blue-200' : 'text-blue-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={ctaHref}
                  className={`flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors ${
                    featured
                      ? 'bg-white hover:bg-blue-50 text-blue-700'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {cta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6">
            {faq.map(({ q, a }) => (
              <div key={q} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Start your free trial today</h2>
        <p className="text-blue-100 mb-8">14 days free. No credit card required.</p>
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
