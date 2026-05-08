import { createServerSupabaseClient } from '@/lib/supabase-server'
import { RedirectType, redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login', RedirectType.replace)
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login', RedirectType.replace)
  }

  const { data: preferences } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .order('event')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your notification preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mb-6">Label: Manage your notification preferences</p>

        {preferences && preferences.length > 0 ? (
          <div className="space-y-3">
            {preferences.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">{pref.event}</p>
                  <p className="text-xs text-gray-500 mt-1">Channel: {pref.channel}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <div className="flex items-center">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={pref.is_enabled ?? true}
                        disabled
                        className="sr-only peer"
                        id={`pref-${pref.id}`}
                      />
                      <label
                        htmlFor={`pref-${pref.id}`}
                        className="flex items-center cursor-not-allowed w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"
                      />
                    </div>
                    <span className="ml-3 text-xs font-medium text-gray-600">
                      {pref.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No notification preferences configured yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
