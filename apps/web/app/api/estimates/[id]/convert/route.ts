import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear()
  const seq = String(count + 1).padStart(4, '0')
  return `INV-${year}-${seq}`
}

function generatePublicToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
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

    // Fetch estimate with line items
    const { data: estimate } = await supabase
      .from('estimates')
      .select('*, estimate_line_items(*)')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const lineItems = (estimate.estimate_line_items as any[]) ?? []

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)

    const invoice_number = generateInvoiceNumber(count ?? 0)
    const public_token = generatePublicToken()

    // Create invoice from estimate
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: userData.organization_id,
        customer_id: estimate.customer_id,
        estimate_id: estimate.id,
        status: 'draft',
        invoice_number,
        public_token,
        title: estimate.title,
        notes: estimate.notes,
        terms: estimate.terms,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        total: estimate.total,
        amount_paid: 0,
        balance_due: estimate.total,
        created_by: user.id,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Copy line items
    if (lineItems.length > 0) {
      await supabase.from('invoice_line_items').insert(
        lineItems.map((li: any, i: number) => ({
          invoice_id: invoice.id,
          organization_id: userData.organization_id,
          price_book_item_id: li.price_book_item_id ?? null,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          taxable: li.taxable,
          sort_order: i,
        })),
      )
    }

    // Mark estimate as accepted
    await supabase
      .from('estimates')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err: any) {
    console.error('[estimates/convert]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
