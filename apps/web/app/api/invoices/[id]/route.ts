import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'void']).optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  sent_at: z.string().optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
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

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, customers(*), invoice_line_items(*), payments(*)')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .single()

    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ invoice })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
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
    const parsed = updateInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const updates: Record<string, unknown> = { ...parsed.data }

    if (parsed.data.status === 'sent' && !parsed.data.sent_at) {
      updates.sent_at = new Date().toISOString()
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ invoice })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
