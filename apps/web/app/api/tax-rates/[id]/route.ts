import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const { name, state, city, county, zip_codes, rate, is_default } = body

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (state !== undefined) updates.state = state.toUpperCase()
    if (city !== undefined) updates.city = city?.trim() || null
    if (county !== undefined) updates.county = county?.trim() || null
    if (rate !== undefined) updates.rate = rate
    if (is_default !== undefined) {
      if (is_default) {
        // Unset other defaults for this org
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('organization_id', userData?.organization_id ?? '')
      }
      updates.is_default = is_default
    }

    // Handle zip_codes
    if (zip_codes !== undefined) {
      if (Array.isArray(zip_codes)) {
        updates.zip_codes = zip_codes
      } else if (typeof zip_codes === 'string') {
        updates.zip_codes = zip_codes.split(',').map((z) => z.trim()).filter((z) => z)
      } else {
        updates.zip_codes = null
      }
    }

    const { data: taxRate, error } = await supabase
      .from('tax_rates')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: taxRate })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('tax_rates')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
