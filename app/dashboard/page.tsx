import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MarginBadge } from '@/components/cost/MarginBadge'

async function getDashboardData() {
  const products = await prisma.product.findMany({
    where: { is_active: true },
    include: { recipe: true },
    orderBy: { name: 'asc' },
  })

  const rows = await Promise.all(
    products.map(async (p) => {
      let cost_per_unit: number | null = null
      let wholesale_margin: number | null = null
      let retail_margin: number | null = null
      try {
        const breakdown = await calculateRecipeCost(p.recipe_id, prisma)
        cost_per_unit = breakdown.cost_per_yield_unit
        if (p.wholesale_price && cost_per_unit > 0)
          wholesale_margin = ((p.wholesale_price - cost_per_unit) / p.wholesale_price) * 100
        if (p.retail_price && cost_per_unit > 0)
          retail_margin = ((p.retail_price - cost_per_unit) / p.retail_price) * 100
      } catch { /* no prices yet */ }
      return { ...p, cost_per_unit, wholesale_margin, retail_margin }
    })
  )
  return rows
}

export default async function DashboardPage() {
  const items = await getDashboardData()

  // Summary stats
  const withCost = items.filter((i) => i.cost_per_unit !== null)
  const withRetailMargin = items.filter((i) => i.retail_margin !== null)
  const withWholesaleMargin = items.filter((i) => i.wholesale_margin !== null)
  const avgRetailMargin = withRetailMargin.length
    ? withRetailMargin.reduce((s, i) => s + i.retail_margin!, 0) / withRetailMargin.length
    : null
  const avgWholesaleMargin = withWholesaleMargin.length
    ? withWholesaleMargin.reduce((s, i) => s + i.wholesale_margin!, 0) / withWholesaleMargin.length
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live cost and margin overview for all active products"
        action={{ label: '+ New Product', href: '/products/new' }}
      />

      {items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-slate-900">No products yet</h3>
            <p className="text-slate-500 text-sm mt-1">
              Create your first product to see cost and margin data here.
            </p>
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
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-slate-500">Active products</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{items.length}</p>
              <p className="text-xs text-slate-400 mt-1">
                {withCost.length} with cost data
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Avg retail margin</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {avgRetailMargin !== null ? `${avgRetailMargin.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {withRetailMargin.length} of {items.length} priced
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Avg wholesale margin</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {avgWholesaleMargin !== null ? `${avgWholesaleMargin.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {withWholesaleMargin.length} of {items.length} priced
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Missing cost data</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {items.length - withCost.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {items.length - withCost.length === 0 ? 'All ingredients priced' : 'need ingredient prices'}
              </p>
            </Card>
          </div>

          {/* Main table */}
          <Card padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Cost / unit</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Wholesale</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Wholesale margin</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Retail</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Retail margin</th>
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
                      {item.selling_unit && (
                        <span className="text-slate-400 text-xs ml-1.5">{item.selling_unit}</span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{item.recipe.name}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      {item.cost_per_unit !== null ? `£${item.cost_per_unit.toFixed(4)}` : (
                        <span className="text-slate-300 text-xs">no data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {item.wholesale_price !== null ? `£${item.wholesale_price.toFixed(2)}` : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <MarginBadge margin={item.wholesale_margin} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {item.retail_price !== null ? `£${item.retail_price.toFixed(2)}` : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <MarginBadge margin={item.retail_margin} />
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
        </>
      )}
    </div>
  )
}
