export * from './client'
export * from './customers'
export * from './jobs'
export * from './invoices'
export * from './estimates'
export * from './price-book'
export * from './bookings'
export * from './organizations'

import type { SupabaseClient } from './client'
import { customersApi } from './customers'
import { jobsApi } from './jobs'
import { invoicesApi } from './invoices'
import { estimatesApi } from './estimates'
import { priceBookApi } from './price-book'
import { bookingsApi } from './bookings'
import { organizationsApi } from './organizations'

export function createApiClient(client: SupabaseClient) {
  return {
    customers: customersApi(client),
    jobs: jobsApi(client),
    invoices: invoicesApi(client),
    estimates: estimatesApi(client),
    priceBook: priceBookApi(client),
    bookings: bookingsApi(client),
    organizations: organizationsApi(client),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
