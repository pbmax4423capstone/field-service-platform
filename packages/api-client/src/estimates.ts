import type { SupabaseClient } from './client'
import type { Estimate, EstimateLineItem, Insert, Update } from '@field-service/shared'

export const estimatesApi = (client: SupabaseClient) => ({
  async list(
    organizationId: string,
    opts?: { status?: string; customerId?: string; page?: number; perPage?: number },
  ) {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 50
    const from = (page - 1) * perPage

    let query = client
      .from('estimates')
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
      .from('estimates')
      .select('*, customers(*), customer_addresses(*), estimate_line_items(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()
  },

  async create(data: Insert<Estimate>) {
    return client.from('estimates').insert(data).select().single()
  },

  async update(id: string, data: Update<Estimate>) {
    return client.from('estimates').update(data).eq('id', id).select().single()
  },

  async markSent(id: string) {
    return client
      .from('estimates')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  },

  lineItems: {
    async list(estimateId: string) {
      return client
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order')
    },
    async create(data: Insert<EstimateLineItem>) {
      return client.from('estimate_line_items').insert(data).select().single()
    },
    async update(id: string, data: Update<EstimateLineItem>) {
      return client.from('estimate_line_items').update(data).eq('id', id).select().single()
    },
    async delete(id: string) {
      return client.from('estimate_line_items').delete().eq('id', id)
    },
  },
})
