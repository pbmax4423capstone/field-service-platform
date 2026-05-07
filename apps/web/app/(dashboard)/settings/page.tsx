import { createServerSupabaseClient } from '@/lib/supabase'
import { StripeConnectButton } from '@/components/settings/StripeConnectButton'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ stripe?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { stripe } = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData?.organization_id ?? '')
    .single()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization settings</p>
      </div>

      {/* Stripe return banners */}
      {stripe === 'success' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Stripe account connected!</p>
            <p className="text-xs text-green-700">You can now accept payments from customers.</p>
          </div>
        </div>
      )}
      {stripe === 'refresh' && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Stripe setup incomplete</p>
            <p className="text-xs text-amber-700">Please try again to complete your Stripe account setup.</p>
          </div>
        </div>
      )}

      {/* Business Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Business Profile</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                defaultValue={org?.name ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                defaultValue={org?.phone ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                defaultValue={org?.email ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                defaultValue={org?.address ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                defaultValue={org?.city ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                defaultValue={org?.state ?? ''}
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL</label>
              <input
                defaultValue={org?.google_review_url ?? ''}
                placeholder="https://g.page/r/your-business/review"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* AI Features */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">AI Features</h2>
        <p className="text-sm text-gray-500 mb-4">Configure AI chat and voice agents for your website</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">AI Chat Agent</p>
              <p className="text-xs text-gray-500">Chat widget on your website that books appointments</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                defaultChecked={org?.ai_chat_enabled ?? false}
                className="sr-only peer"
                id="chat-toggle"
              />
              <label
                htmlFor="chat-toggle"
                className="flex items-center cursor-pointer w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">AI Voice Agent</p>
              <p className="text-xs text-gray-500">Answers phone calls and books appointments 24/7</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                defaultChecked={org?.ai_voice_enabled ?? false}
                className="sr-only peer"
                id="voice-toggle"
              />
              <label
                htmlFor="voice-toggle"
                className="flex items-center cursor-pointer w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer-focus:ring-2 peer-focus:ring-blue-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Payments (Stripe Connect)</h2>
            <p className="text-sm text-gray-500 mt-0.5">Accept credit card payments from customers</p>
          </div>
          {org?.stripe_onboarding_complete ? (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              ✓ Connected
            </span>
          ) : (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
              Not configured
            </span>
          )}
        </div>

        <StripeConnectButton
          isConnected={org?.stripe_onboarding_complete ?? false}
          stripeAccountId={org?.stripe_account_id ?? null}
        />
      </div>
    </div>
  )
}
