import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { getIngredientStockLevels } from '@/lib/stock-calculator'
import { calculateMenuEngineering, CATEGORY_META } from '@/lib/menu-engineer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MarginBadge } from '@/components/cost/MarginBadge'

async function getWasteStats() {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.wasteLog.findMany({
      where: { logged_at: { gte: weekAgo } },
      select: { cost_at_log: true },
    }),
    prisma.wasteLog.findMany({
      where: { logged_at: { gte: twoWeeksAgo, lt: weekAgo } },
      select: { cost_at_log: true },
    }),
  ])

  const thisWeekCost = thisWeek.reduce((s, l) => s + (l.cost_at_log ?? 0), 0)
  const lastWeekCost = lastWeek.reduce((s, l) => s + (l.cost_at_log ?? 0), 0)
  const entries = thisWeek.length

  return { thisWeekCost, lastWeekCost, entries }
}

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

async function getMenuEngineeringSummary() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)
  try {
    return await calculateMenuEngineering(thirtyDaysAgo, now, prisma)
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const [items, stockLevels, wasteStats, meResult] = await Promise.all([
    getDashboardData(),
    getIngredientStockLevels(prisma),
    getWasteStats(),
    getMenuEngineeringSummary(),
  ])

  const stockValues = Array.from(stockLevels.values())
  const criticalCount = stockValues.filter((s) => s.status === 'critical').length
  const lowCount = stockValues.filter((s) => s.status === 'low').length
  const noCountExists = stockValues.length > 0 && stockValues.every((s) => s.status === 'no_count')
  const hasParIngredients = stockValues.length > 0

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

          {/* Low stock alert widget */}
          {hasParIngredients && (
            <Card className={criticalCount > 0 ? 'border-red-200 bg-red-50' : lowCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Stock Levels</p>
                  {noCountExists ? (
                    <p className="text-sm text-slate-600">
                      No stock count submitted yet.{' '}
                      <Link href="/stockcounts/new" className="text-blue-600 hover:underline">Record a count</Link>{' '}
                      to see alerts.
                    </p>
                  ) : criticalCount === 0 && lowCount === 0 ? (
                    <p className="text-sm text-green-700">All tracked ingredients are above par level.</p>
                  ) : (
                    <div className="flex gap-4">
                      {criticalCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Critical</span>
                          <span className="text-sm font-bold text-red-700">{criticalCount}</span>
                          <span className="text-xs text-slate-500">ingredient{criticalCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {lowCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Low</span>
                          <span className="text-sm font-bold text-amber-700">{lowCount}</span>
                          <span className="text-xs text-slate-500">ingredient{lowCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!noCountExists && (criticalCount > 0 || lowCount > 0) && (
                  <Link
                    href="/ingredients?filter=low"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors shrink-0 ml-4"
                  >
                    View low stock →
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Waste this week */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Waste this week</p>
                <p className="text-2xl font-bold text-slate-900">
                  £{wasteStats.thisWeekCost.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {wasteStats.entries} {wasteStats.entries === 1 ? 'entry' : 'entries'}
                  {wasteStats.lastWeekCost > 0 && (
                    <>
                      {' · '}
                      {wasteStats.thisWeekCost <= wasteStats.lastWeekCost ? (
                        <span className="text-green-600">
                          ↓ {((1 - wasteStats.thisWeekCost / wasteStats.lastWeekCost) * 100).toFixed(0)}% vs last week
                        </span>
                      ) : (
                        <span className="text-red-600">
                          ↑ {((wasteStats.thisWeekCost / wasteStats.lastWeekCost - 1) * 100).toFixed(0)}% vs last week
                        </span>
                      )}
                    </>
                  )}
                  {wasteStats.lastWeekCost === 0 && wasteStats.thisWeekCost > 0 && (
                    <>{' · '}<span className="text-slate-400">no data last week</span></>
                  )}
                </p>
              </div>
              <Link
                href="/waste"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors shrink-0 ml-4"
              >
                View waste log →
              </Link>
            </div>
          </Card>

          {/* Menu Engineering summary */}
          {meResult && meResult.products.length > 0 && (() => {
            const cats = meResult.products.reduce(
              (acc, p) => { acc[p.category] = (acc[p.category] ?? 0) + 1; return acc },
              {} as Record<string, number>
            )
            return (
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Menu Engineering (last 30 days)</p>
                    <div className="flex flex-wrap gap-3">
                      {(['star', 'puzzle', 'plowhorse', 'dog'] as const).map((cat) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span className="text-base">{CATEGORY_META[cat].emoji}</span>
                          <span className="text-sm font-bold text-slate-900">{cats[cat] ?? 0}</span>
                          <span className="text-xs text-slate-500">{CATEGORY_META[cat].label}{(cats[cat] ?? 0) !== 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link
                    href="/reports/menu-engineering"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors shrink-0 ml-4"
                  >
                    Full analysis →
                  </Link>
                </div>
              </Card>
            )
          })()}

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
