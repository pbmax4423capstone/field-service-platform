import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PRICE_BOOK_CATEGORIES, formatCurrency } from '@field-service/shared'
import { AddItemButton } from '@/components/price-book/AddItemModal'

export default async function PriceBookPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: items } = await supabase
    .from('price_book_items')
    .select('*')
    .eq('organization_id', userData?.organization_id ?? '')
    .eq('is_active', true)
    .order('category')
    .order('sort_order')
    .order('name')

  const groupedItems = PRICE_BOOK_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value] = (items ?? []).filter((item: any) => item.category === cat.value)
      return acc
    },
    {} as Record<string, any[]>,
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Book</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(items ?? []).length} active services & parts</p>
        </div>
        <AddItemButton />
      </div>

      <div className="space-y-6">
        {PRICE_BOOK_CATEGORIES.map((cat) => {
          const catItems = groupedItems[cat.value] ?? []
          if (catItems.length === 0) return null

          return (
            <div key={cat.value}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {cat.label}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Service / Part
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Price
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5 hidden sm:table-cell">
                        Cost
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5 hidden md:table-cell">
                        Taxable
                      </th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                          {formatCurrency(item.unit_price * 100)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-gray-500 hidden sm:table-cell">
                          {item.cost != null ? formatCurrency(item.cost * 100) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right hidden md:table-cell">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              item.taxable
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {item.taxable ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button className="text-xs text-blue-600 hover:underline">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {(items ?? []).length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm mb-4">Your price book is empty.</p>
            <AddItemButton label="Add your first service" />
          </div>
        )}
      </div>
    </div>
  )
}
