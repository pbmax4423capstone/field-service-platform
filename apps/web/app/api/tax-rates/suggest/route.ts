import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get('state')?.toUpperCase()
    const city = searchParams.get('city')?.toLowerCase()
    const zip = searchParams.get('zip')

    if (!state) {
      return NextResponse.json({ error: 'State parameter is required' }, { status: 400 })
    }

    // Fetch all tax rates for this org
    const { data: taxRates, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('state', state)

    if (error) throw error

    if (!taxRates || taxRates.length === 0) {
      // No rates for this state
      return NextResponse.json({ data: null })
    }

    // Match priority:
    // 1. Zip code match
    // 2. City match
    // 3. County match
    // 4. State match (any rate with this state)
    // 5. is_default rate

    let bestMatch = null
    let bestPriority = -1

    for (const rate of taxRates) {
      let priority = -1

      // Priority 1: zip code match
      if (zip && rate.zip_codes && rate.zip_codes.includes(zip)) {
        priority = 4
      }
      // Priority 2: city match
      else if (city && rate.city && rate.city.toLowerCase() === city) {
        priority = 3
      }
      // Priority 3: county match
      else if (rate.county) {
        priority = 2
      }
      // Priority 4: state match (already filtered to this state)
      else if (rate.state === state && !rate.city && !rate.county) {
        priority = 1
      }

      // Priority 5: default flag
      if (priority === -1 && rate.is_default) {
        priority = 0
      }

      if (priority > bestPriority) {
        bestMatch = rate
        bestPriority = priority
      }
    }

    return NextResponse.json({ data: bestMatch })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
