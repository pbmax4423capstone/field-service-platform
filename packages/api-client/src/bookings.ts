import type { SupabaseClient } from './client'
import type { Booking, Insert, Update } from '@field-service/shared'

export const bookingsApi = (client: SupabaseClient) => ({
  async list(
    organizationId: string,
    opts?: { status?: string; page?: number; perPage?: number },
  ) {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 50
    const from = (page - 1) * perPage

    let query = client
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, from + perPage - 1)

    if (opts?.status) query = query.eq('status', opts.status)

    return query
  },

  async getById(id: string, organizationId: string) {
    return client
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()
  },

  async create(data: Insert<Booking>) {
    return client.from('bookings').insert(data).select().single()
  },

  async update(id: string, data: Update<Booking>) {
    return client.from('bookings').update(data).eq('id', id).select().single()
  },
})
