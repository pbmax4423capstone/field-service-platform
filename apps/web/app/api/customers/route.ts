import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
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
    const { first_name, last_name, phone, email, phone_alt, notes, tags, address } = body

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        organization_id: userData.organization_id,
        first_name: first_name?.trim(),
        last_name: last_name?.trim(),
        phone: phone?.trim(),
        email: email?.trim() || null,
        phone_alt: phone_alt?.trim() || null,
        notes: notes?.trim() || null,
        tags: tags ?? [],
      })
      .select()
      .single()

    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 })

    // If an address was provided, insert it as the primary service address
    if (address?.street?.trim()) {
      await supabase.from('customer_addresses').insert({
        customer_id: customer.id,
        organization_id: userData.organization_id,
        label: 'Service Address',
        street: address.street.trim(),
        city: address.city?.trim() ?? '',
        state: address.state?.trim() ?? '',
        zip: address.zip?.trim() ?? '',
        is_primary: true,
        access_notes: address.access_notes?.trim() || null,
      })
    }

    return NextResponse.json({ id: customer.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
