import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { SalesEntryForm } from '@/components/sales/SalesEntryForm'

export default async function SalesPage() {
  const [products, recentEntries] = await Promise.all([
    prisma.product.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, selling_unit: true },
    }),
    prisma.salesEntry.findMany({
      orderBy: { period_date: 'desc' },
      take: 50,
      include: { product: { select: { name: true } } },
    }),
  ])

  // Group recent entries by period_date
  const byDate = new Map<string, typeof recentEntries>()
  for (const e of recentEntries) {
    const key = e.period_date.toISOString().split('T')[0]
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(e)
  }
  const groupedEntries = Array.from(byDate.entries())

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Data"
        description="Record units sold per product for AvT food cost reporting"
      />

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-4">
            No active products found.{' '}
            <a href="/products/new" className="text-blue-600 hover:underline">Create a product</a> first.
          </p>
        </Card>
      ) : (
        <SalesEntryForm products={products} />
      )}

      {groupedEntries.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Sales Entries</h2>
          <div className="space-y-4">
            {groupedEntries.map(([dateStr, entries]) => (
              <Card key={dateStr} padding="none">
                <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                  <p className="text-sm font-semibold text-slate-700">
                    {new Date(dateStr).toLocaleDateString('en-GB', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-6 py-2.5 text-slate-800">{e.product.name}</td>
                        <td className="px-6 py-2.5 text-right font-mono text-slate-700">{e.quantity}</td>
                        <td className="px-6 py-2.5 text-xs text-slate-400">
                          {new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
