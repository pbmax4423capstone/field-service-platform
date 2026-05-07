import type { SupabaseClient } from './client'
import type { Insert, Invoice, InvoiceLineItem, Update } from '@field-service/shared'

export const invoicesApi = (client: SupabaseClient) => ({
  async list(
    organizationId: string,
    opts?: { status?: string; customerId?: string; page?: number; perPage?: number },
  ) {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 50
    const from = (page - 1) * perPage

    let query = client
      .from('invoices')
      .select('*, customers(first_name, last_name, email)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, from + perPage - 1)

    if (opts?.status) query = query.eq('status', opts.status)
    if (opts?.customerId) query = query.eq('customer_id', opts.customerId)

    return query
  },

  async getById(id: string, organizationId: string) {
    return client
      .from('invoices')
      .select('*, customers(*), invoice_line_items(*), payments(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()
  },

  async getByPublicToken(token: string) {
    return client
      .from('invoices')
      .select('*, customers(*), invoice_line_items(*), organizations(name, logo_url, phone, email)')
      .eq('public_token', token)
      .single()
  },

  async create(data: Insert<Invoice>) {
    return client.from('invoices').insert(data).select().single()
  },

  async update(id: string, data: Update<Invoice>) {
    return client.from('invoices').update(data).eq('id', id).select().single()
  },

  async markSent(id: string) {
    return client
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  },

  async markViewed(id: string) {
    return client
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  },

  lineItems: {
    async list(invoiceId: string) {
      return client
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order')
    },
    async create(data: Insert<InvoiceLineItem>) {
      return client.from('invoice_line_items').insert(data).select().single()
    },
    async update(id: string, data: Update<InvoiceLineItem>) {
      return client.from('invoice_line_items').update(data).eq('id', id).select().single()
    },
    async delete(id: string) {
      return client.from('invoice_line_items').delete().eq('id', id)
    },
    async bulkReplace(invoiceId: string, items: Insert<InvoiceLineItem>[]) {
      await client.from('invoice_line_items').delete().eq('invoice_id', invoiceId)
      return client.from('invoice_line_items').insert(items).select()
    },
  },
})
