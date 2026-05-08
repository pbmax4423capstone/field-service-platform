import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SocialFeed } from '@/components/social/social-feed'

export const metadata = {
  title: 'Social Media — DispatchForce AI',
}

export default async function SocialPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = (userData as any)?.organization_id ?? ''

  const { data: posts } = await supabase
    .from('social_posts')
    .select('id, platforms, content, status, scheduled_for, published_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-5">
      <SocialFeed initialPosts={(posts as any) ?? []} />
    </div>
  )
}
