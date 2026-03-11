import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MarginBadge } from '@/components/cost/MarginBadge'

async function getDashboard() {
  const res = await fetch('http://localhost:3000/api/dashboard', { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

interface DashboardItem {
  id: number
  name: string
  recipe_name: string
  selling_price: number | null
  selling_unit: string | null
  cost_per_unit: number | null
  margin_percent: number | null
  is_active: boolean
}

export default async function DashboardPage() {
  const items: DashboardItem[] = await getDashboard()

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of all active product costs and margins"
        action={{ label: '+ New Product', href: '/products/new' }}
      />
      {items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-slate-900">No products yet</h3>
            <p className="text-slate-500 text-sm mt-1">Create your first product to see cost and margin data here.</p>
            <div className="flex justify-center gap-3 mt-4">
              <Link href="/products/new" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700">
                + New Product
              </Link>
              <Link href="/recipes/new" className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                + New Recipe
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Recipe</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Cost / unit</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Selling price</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Margin</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/products/${item.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.recipe_name}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {item.cost_per_unit !== null ? `£${item.cost_per_unit.toFixed(4)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {item.selling_price !== null ? `£${item.selling_price.toFixed(2)}` : '—'}
                    {item.selling_unit && <span className="text-slate-400 text-xs ml-1">{item.selling_unit}</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <MarginBadge margin={item.margin_percent} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={item.is_active ? 'green' : 'gray'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
