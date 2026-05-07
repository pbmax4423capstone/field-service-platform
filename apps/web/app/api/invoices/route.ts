import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  taxable: z.boolean().default(false),
})

const createInvoiceSchema = z.object({
  customer_id: z.string().uuid(),
  job_id: z.string().uuid().optional().nullable(),
  estimate_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  tax_rate: z.number().min(0).max(1).default(0),
  due_date: z.string().optional().nullable(),
  line_items: z.array(lineItemSchema).default([]),
})

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
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { line_items, tax_rate, ...invoiceData } = parsed.data

    // Calculate totals
    const subtotal = line_items.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const taxableAmount = line_items
      .filter((li) => li.taxable)
      .reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
    const tax_amount = taxableAmount * tax_rate
    const total = subtotal + tax_amount

    // Get count for invoice number
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)

    const invoice_number = generateInvoiceNumber(count ?? 0)
    const public_token = generatePublicToken()

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        organization_id: userData.organization_id,
        status: 'draft',
        invoice_number,
        public_token,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        amount_paid: 0,
        balance_due: total,
        created_by: user.id,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create line items
    if (line_items.length > 0) {
      const { error: liError } = await supabase.from('invoice_line_items').insert(
        line_items.map((li, i) => ({
          ...li,
          invoice_id: invoice.id,
          organization_id: userData.organization_id,
          sort_order: i,
        })),
      )
      if (liError) throw liError
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err: any) {
    console.error('[invoices POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
