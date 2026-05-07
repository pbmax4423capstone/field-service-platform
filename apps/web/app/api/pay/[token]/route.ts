import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  try {
    const supabase = createAdminClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, title, status, total, amount_paid, balance_due,
        subtotal, tax_rate, tax_amount, due_date, notes, created_at,
        customers(first_name, last_name, email),
        invoice_line_items(name, description, quantity, unit_price, taxable, sort_order),
        organizations(name, phone, email, address, city, state, stripe_onboarding_complete)
      `)
      .eq('public_token', token)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    // Sort line items
    const lineItems = ((invoice.invoice_line_items as any[]) ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    )

    return NextResponse.json({ invoice: { ...invoice, invoice_line_items: lineItems } })
  } catch (err: any) {
    console.error('[pay/token]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
