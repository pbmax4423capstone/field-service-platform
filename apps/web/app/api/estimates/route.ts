import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  taxable: z.boolean().default(false),
})

const createEstimateSchema = z.object({
  customer_id: z.string().uuid(),
  address_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  tax_rate: z.number().min(0).max(1).default(0),
  valid_until: z.string().optional().nullable(),
  line_items: z.array(lineItemSchema).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, id')
      .eq('id', user.id)
      .single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json()
    const parsed = createEstimateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { line_items, tax_rate, ...estimateData } = parsed.data

    const subtotal = line_items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const taxableAmount = line_items
      .filter((li) => li.taxable)
      .reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const tax_amount = taxableAmount * tax_rate
    const total = subtotal + tax_amount

    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert({
        ...estimateData,
        organization_id: userData.organization_id,
        status: 'draft',
        subtotal,
        tax_rate,
        tax_amount,
        total,
        created_by: user.id,
      })
      .select()
      .single()

    if (estimateError) throw estimateError

    if (line_items.length > 0) {
      const { error: liError } = await supabase.from('estimate_line_items').insert(
        line_items.map((li, i) => ({
          ...li,
          estimate_id: estimate.id,
          organization_id: userData.organization_id,
          sort_order: i,
        })),
      )
      if (liError) throw liError
    }

    return NextResponse.json({ estimate }, { status: 201 })
  } catch (err: any) {
    console.error('[estimates POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
