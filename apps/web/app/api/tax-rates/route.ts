import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
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

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: taxRates, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .order('name')

    if (error) throw error

    return NextResponse.json({ data: taxRates })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, state, city, county, zip_codes, rate, is_default } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!state || state.length !== 2) {
      return NextResponse.json({ error: 'State must be 2 characters' }, { status: 400 })
    }

    if (rate === undefined || rate === null || typeof rate !== 'number' || rate < 0 || rate > 1) {
      return NextResponse.json({ error: 'Rate must be a number between 0 and 1' }, { status: 400 })
    }

    // If setting as default, unset other defaults for this org
    if (is_default) {
      await supabase
        .from('tax_rates')
        .update({ is_default: false })
        .eq('organization_id', userData.organization_id)
    }

    // Parse zip_codes if provided
    let parsedZipCodes = null
    if (zip_codes && Array.isArray(zip_codes)) {
      parsedZipCodes = zip_codes
    } else if (zip_codes && typeof zip_codes === 'string') {
      parsedZipCodes = zip_codes.split(',').map((z) => z.trim()).filter((z) => z)
    }

    const { data: taxRate, error } = await supabase
      .from('tax_rates')
      .insert({
        organization_id: userData.organization_id,
        name: name.trim(),
        state: state.toUpperCase(),
        city: city?.trim() || null,
        county: county?.trim() || null,
        zip_codes: parsedZipCodes,
        rate,
        is_default: !!is_default,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: taxRate })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
