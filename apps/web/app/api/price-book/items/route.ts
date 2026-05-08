import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CATEGORIES = ['repair', 'maintenance', 'installation', 'parts', 'other']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const organizationId = userData?.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, category, unit_price, cost, taxable } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (typeof unit_price !== 'number' || unit_price < 0) {
      return NextResponse.json({ error: 'Unit price must be a non-negative number' }, { status: 400 })
    }

    if (typeof taxable !== 'boolean') {
      return NextResponse.json({ error: 'Taxable must be a boolean' }, { status: 400 })
    }

    // Find or create default price book
    const { data: existingBooks } = await supabase
      .from('price_books')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)

    let priceBookId: string

    if (existingBooks && existingBooks.length > 0) {
      priceBookId = existingBooks[0].id
    } else {
      const { data: newBook, error: createError } = await supabase
        .from('price_books')
        .insert({
          organization_id: organizationId,
          name: 'Default Price Book',
          is_active: true,
        })
        .select('id')
        .single()

      if (createError || !newBook) {
        throw createError || new Error('Failed to create price book')
      }

      priceBookId = newBook.id
    }

    // Insert price book item
    const { data: item, error: insertError } = await supabase
      .from('price_book_items')
      .insert({
        price_book_id: priceBookId,
        organization_id: organizationId,
        name: name.trim(),
        description: description || null,
        category,
        unit_price,
        cost: cost ?? null,
        taxable,
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single()

    if (insertError || !item) {
      throw insertError || new Error('Failed to create price book item')
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : (error as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
