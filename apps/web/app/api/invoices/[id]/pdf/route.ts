import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import PDFDocument from 'pdfkit'

interface RouteParams {
  params: Promise<{ id: string }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
      .select(`
        *,
        customers(first_name, last_name, email, phone),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .single()

    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: org } = await supabase
      .from('organizations')
      .select('name, email, phone, address, city, state, zip')
      .eq('id', userData?.organization_id ?? '')
      .single()

    const customer = invoice.customers as any
    const lineItems = (invoice.invoice_line_items as any[]) ?? []

    // Build PDF in memory
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const pdfComplete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    // ── Header ──────────────────────────────────────────────
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1e40af')
      .text(org?.name ?? 'DispatchForce AI', 50, 50)

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(org?.address ?? '', 50, 82)
      .text(
        [org?.city, org?.state, org?.zip].filter(Boolean).join(', '),
        50,
        96,
      )
    if (org?.phone) doc.text(org.phone, 50, 110)
    if (org?.email) doc.text(org.email, 50, 124)

    // Invoice title block (top right)
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('INVOICE', 350, 50, { align: 'right', width: 200 })

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text(`Invoice #: ${invoice.invoice_number}`, 350, 90, { align: 'right', width: 200 })
      .text(`Date: ${formatDate(invoice.created_at)}`, 350, 105, { align: 'right', width: 200 })
      .text(
        `Due: ${invoice.due_date ? formatDate(invoice.due_date) : 'Upon receipt'}`,
        350, 120, { align: 'right', width: 200 },
      )

    // Status badge
    const statusColors: Record<string, string> = {
      paid: '#10b981',
      overdue: '#ef4444',
      sent: '#3b82f6',
      draft: '#6b7280',
      viewed: '#8b5cf6',
    }
    const statusColor = statusColors[invoice.status] ?? '#6b7280'
    doc
      .roundedRect(445, 140, 105, 22, 4)
      .fill(statusColor)
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text(invoice.status.toUpperCase(), 445, 146, { align: 'center', width: 105 })

    // ── Divider ─────────────────────────────────────────────
    doc.moveTo(50, 175).lineTo(562, 175).strokeColor('#e5e7eb').lineWidth(1).stroke()

    // ── Bill To ─────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('BILL TO', 50, 190)
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(`${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`, 50, 205)
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
    if (customer?.email) doc.text(customer.email, 50, 220)
    if (customer?.phone) doc.text(customer.phone, 50, customer?.email ? 235 : 220)

    // ── Line Items Table ─────────────────────────────────────
    const tableTop = 275
    const colX = { item: 50, desc: 50, qty: 340, price: 400, total: 470 }

    // Table header
    doc
      .rect(50, tableTop - 5, 512, 22)
      .fill('#f3f4f6')

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#374151')
      .text('ITEM', colX.item, tableTop)
      .text('QTY', colX.qty, tableTop)
      .text('UNIT PRICE', colX.price, tableTop)
      .text('TOTAL', colX.total, tableTop)

    doc.moveTo(50, tableTop + 18).lineTo(562, tableTop + 18).strokeColor('#e5e7eb').stroke()

    // Table rows
    let rowY = tableTop + 28
    lineItems.forEach((li: any) => {
      const lineTotal = li.quantity * li.unit_price

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(li.name, colX.item, rowY, { width: 270 })

      if (li.description) {
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(li.description, colX.item, rowY + 13, { width: 270 })
      }

      const descOffset = li.description ? 26 : 14

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#374151')
        .text(String(li.quantity), colX.qty, rowY)
        .text(formatCurrency(li.unit_price), colX.price, rowY)
        .text(formatCurrency(lineTotal), colX.total, rowY)

      rowY += descOffset
      doc.moveTo(50, rowY).lineTo(562, rowY).strokeColor('#f3f4f6').stroke()
      rowY += 4
    })

    // ── Totals ───────────────────────────────────────────────
    const totalsY = rowY + 16

    doc
      .moveTo(340, totalsY - 8)
      .lineTo(562, totalsY - 8)
      .strokeColor('#e5e7eb')
      .stroke()

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#374151')
      .text('Subtotal', 340, totalsY)
      .text(formatCurrency(invoice.subtotal), 470, totalsY)

    if (invoice.tax_rate > 0) {
      doc
        .text(`Tax (${(invoice.tax_rate * 100).toFixed(1)}%)`, 340, totalsY + 16)
        .text(formatCurrency(invoice.tax_amount), 470, totalsY + 16)
    }

    const totalY = totalsY + (invoice.tax_rate > 0 ? 40 : 24)
    doc.moveTo(340, totalY - 4).lineTo(562, totalY - 4).strokeColor('#e5e7eb').stroke()

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Total', 340, totalY)
      .text(formatCurrency(invoice.total), 470, totalY)

    if (invoice.amount_paid > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#10b981')
        .text('Amount Paid', 340, totalY + 18)
        .text(`-${formatCurrency(invoice.amount_paid)}`, 470, totalY + 18)

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#ef4444')
        .text('Balance Due', 340, totalY + 36)
        .text(formatCurrency(invoice.balance_due), 470, totalY + 36)
    }

    // ── Notes / Terms ────────────────────────────────────────
    if (invoice.notes || invoice.terms) {
      const notesY = totalY + 70
      doc.moveTo(50, notesY - 10).lineTo(562, notesY - 10).strokeColor('#e5e7eb').stroke()

      if (invoice.notes) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#6b7280')
          .text('NOTES', 50, notesY)
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(invoice.notes, 50, notesY + 14, { width: 240 })
      }

      if (invoice.terms) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#6b7280')
          .text('TERMS', 310, notesY)
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#374151')
          .text(invoice.terms, 310, notesY + 14, { width: 240 })
      }
    }

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#9ca3af')
      .text('Thank you for your business!', 50, 720, { align: 'center', width: 512 })

    doc.end()
    const pdfBuffer = await pdfComplete

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err: any) {
    console.error('[invoices/pdf]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
