import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = userData?.organization_id

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 400 }
    )
  }

  const body = await request.json()

  const { name, description, category, unit_price, cost, taxable, is_active } = body

  const updateData: Record<string, any> = {}

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (category !== undefined) updateData.category = category
  if (unit_price !== undefined) updateData.unit_price = unit_price
  if (cost !== undefined) updateData.cost = cost
  if (taxable !== undefined) updateData.taxable = taxable
  if (is_active !== undefined) updateData.is_active = is_active

  try {
    const { data: item, error } = await supabase
      .from('price_book_items')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ item }, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
