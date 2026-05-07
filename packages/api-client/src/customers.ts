import type { SupabaseClient } from './client'
import type { Customer, CustomerAddress, CustomerEquipment, Insert, Update } from '@field-service/shared'

export const customersApi = (client: SupabaseClient) => ({
  async list(organizationId: string, opts?: { search?: string; page?: number; perPage?: number }) {
    const page = opts?.page ?? 1
    const perPage = opts?.perPage ?? 50
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = client
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('last_name', { ascending: true })
      .range(from, to)

    if (opts?.search) {
      query = query.or(
        `first_name.ilike.%${opts.search}%,last_name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`,
      )
    }

    return query
  },

  async getById(id: string, organizationId: string) {
    return client
      .from('customers')
      .select('*, customer_addresses(*), customer_equipment(*)')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()
  },

  async create(data: Insert<Customer>) {
    return client.from('customers').insert(data).select().single()
  },

  async update(id: string, data: Update<Customer>) {
    return client.from('customers').update(data).eq('id', id).select().single()
  },

  async delete(id: string) {
    return client.from('customers').delete().eq('id', id)
  },

  addresses: {
    async list(customerId: string) {
      return client
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })
    },

    async create(data: Insert<CustomerAddress>) {
      return client.from('customer_addresses').insert(data).select().single()
    },

    async update(id: string, data: Update<CustomerAddress>) {
      return client.from('customer_addresses').update(data).eq('id', id).select().single()
    },

    async delete(id: string) {
      return client.from('customer_addresses').delete().eq('id', id)
    },
  },

  equipment: {
    async list(customerId: string) {
      return client.from('customer_equipment').select('*').eq('customer_id', customerId)
    },

    async create(data: Insert<CustomerEquipment>) {
      return client.from('customer_equipment').insert(data).select().single()
    },

    async update(id: string, data: Update<CustomerEquipment>) {
      return client.from('customer_equipment').update(data).eq('id', id).select().single()
    },

    async delete(id: string) {
      return client.from('customer_equipment').delete().eq('id', id)
    },
  },
})
