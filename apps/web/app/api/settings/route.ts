import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone, email, address, city, state, google_review_url, ai_chat_enabled, ai_voice_enabled } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email
    if (address !== undefined) updates.address = address
    if (city !== undefined) updates.city = city
    if (state !== undefined) updates.state = state
    if (google_review_url !== undefined) updates.google_review_url = google_review_url
    if (ai_chat_enabled !== undefined) updates.ai_chat_enabled = ai_chat_enabled
    if (ai_voice_enabled !== undefined) updates.ai_voice_enabled = ai_voice_enabled

    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', userData.organization_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
