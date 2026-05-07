import type { SupabaseClient } from './client'
import type { Insert, PriceBook, PriceBookItem, Update } from '@field-service/shared'

export const priceBookApi = (client: SupabaseClient) => ({
  async getOrCreate(organizationId: string): Promise<PriceBook> {
    const { data: existing } = await client
      .from('price_books')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (existing) return existing

    const { data: created } = await client
      .from('price_books')
      .insert({ organization_id: organizationId, name: 'Default Price Book', is_active: true })
      .select()
      .single()

    return created!
  },

  items: {
    async list(organizationId: string, opts?: { category?: string; search?: string }) {
      let query = client
        .from('price_book_items')
        .select('*, price_books!inner(organization_id)')
        .eq('price_books.organization_id', organizationId)
        .eq('is_active', true)
        .order('category')
        .order('sort_order')

      if (opts?.category) query = query.eq('category', opts.category)
      if (opts?.search) query = query.ilike('name', `%${opts.search}%`)

      return query
    },

    async create(data: Insert<PriceBookItem>) {
      return client.from('price_book_items').insert(data).select().single()
    },

    async update(id: string, data: Update<PriceBookItem>) {
      return client.from('price_book_items').update(data).eq('id', id).select().single()
    },

    async delete(id: string) {
      return client.from('price_book_items').update({ is_active: false }).eq('id', id)
    },
  },
})
