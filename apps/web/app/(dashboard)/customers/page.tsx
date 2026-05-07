import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiClient } from '@field-service/api-client'
import Link from 'next/link'
import { formatPhone, formatDate } from '@field-service/shared'
import { Plus, Search } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const { search, page: pageParam } = await searchParams
  const page = Number(pageParam ?? 1)

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const api = createApiClient(supabase as any)
  const { data: customers, count } = userData?.organization_id
    ? await api.customers.list(userData.organization_id, { search, page, perPage: 50 })
    : { data: [], count: 0 }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total customers</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </Link>
      </div>

      {/* Search */}
      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name, phone, or email…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">
                Phone
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">
                Email
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">
                Added
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(customers ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  {search ? `No customers matching "${search}"` : 'No customers yet'}
                </td>
              </tr>
            ) : (
              (customers ?? []).map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">
                    {formatPhone(c.phone)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                    {c.email ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
