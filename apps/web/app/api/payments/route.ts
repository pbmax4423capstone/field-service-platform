import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'check', 'ach', 'other']),
  notes: z.string().optional(),
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const body = await req.json()
    const parsed = recordPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { invoice_id, amount, method, notes } = parsed.data
    const organization_id = userData?.organization_id ?? ''

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        organization_id,
        invoice_id,
        amount,
        method,
        status: 'succeeded',
        collected_by: user.id,
        notes: notes || null,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', invoice_id)
      .eq('status', 'succeeded')

    const totalPaid = (payments ?? []).reduce((sum: number, p: any) => sum + p.amount, 0)

    // Fetch invoice total to determine if fully paid
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total')
      .eq('id', invoice_id)
      .eq('organization_id', organization_id)
      .single()

    const invoiceUpdates: Record<string, unknown> = { amount_paid: totalPaid }
    const isPaid = invoice && totalPaid >= invoice.total - 0.01
    if (isPaid) {
      invoiceUpdates.status = 'paid'
      invoiceUpdates.paid_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(invoiceUpdates)
      .eq('id', invoice_id)
      .eq('organization_id', organization_id)

    if (updateError) throw updateError

    return NextResponse.json({ payment }, { status: 201 })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
