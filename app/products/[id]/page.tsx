import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MarginBadge } from '@/components/cost/MarginBadge'
import { CostBreakdownTree } from '@/components/cost/CostBreakdownTree'
import { CostHistoryChart } from '@/components/cost/CostHistoryChart'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id: parseInt(id) },
    include: {
      recipe: true,
      cost_snapshots: {
        orderBy: { snapshotted_at: 'asc' },
        select: { id: true, total_cost: true, snapshotted_at: true },
      },
    },
  })
  if (!product) notFound()

  let costBreakdown = null
  try {
    costBreakdown = await calculateRecipeCost(product.recipe_id, prisma)
  } catch {
    // Prices not set yet
  }

  const cost = costBreakdown?.cost_per_yield_unit ?? null
  const wholesaleMargin = cost && product.wholesale_price
    ? ((product.wholesale_price - cost) / product.wholesale_price) * 100
    : null
  const retailMargin = cost && product.retail_price
    ? ((product.retail_price - cost) / product.retail_price) * 100
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.description ?? undefined}
        action={{ label: 'Edit', href: `/products/${id}/edit` }}
      />

      <div className="grid grid-cols-5 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-2">
            <Badge variant={product.is_active ? 'green' : 'gray'}>
              {product.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Cost / unit</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {cost !== null ? `£${cost.toFixed(4)}` : '—'}
          </p>
          {product.selling_unit && <p className="text-xs text-slate-400 mt-1">{product.selling_unit}</p>}
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Wholesale price</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {product.wholesale_price !== null ? `£${product.wholesale_price.toFixed(2)}` : '—'}
          </p>
          <div className="mt-1.5">
            <MarginBadge margin={wholesaleMargin} />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Retail price</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {product.retail_price !== null ? `£${product.retail_price.toFixed(2)}` : '—'}
          </p>
          <div className="mt-1.5">
            <MarginBadge margin={retailMargin} />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Markup (retail)</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {cost && product.retail_price
              ? `${((product.retail_price / cost) * 100 - 100).toFixed(0)}%`
              : '—'}
          </p>
          <p className="text-xs text-slate-400 mt-1">over cost</p>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-slate-500 mb-1">Recipe</p>
        <Link href={`/recipes/${product.recipe_id}`} className="font-medium text-slate-900 hover:text-blue-600">
          {product.recipe.name}
        </Link>
        <span className="text-slate-400 text-sm ml-2">
          yields {product.recipe.yield_quantity} {product.recipe.yield_unit}
        </span>
      </Card>

      {costBreakdown && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Cost Breakdown
            <span className="ml-2 text-sm font-normal text-slate-500">
              Total: £{costBreakdown.total_cost.toFixed(4)}
            </span>
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-4 text-sm font-semibold text-slate-600">Component</th>
                <th className="text-right py-2 px-4 text-sm font-semibold text-slate-600">Quantity</th>
                <th className="text-right py-2 px-4 text-sm font-semibold text-slate-600">Unit cost</th>
                <th className="text-right py-2 px-4 text-sm font-semibold text-slate-600">Line cost</th>
              </tr>
            </thead>
            <tbody>
              <CostBreakdownTree nodes={costBreakdown.components} />
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Cost History</h2>
        <CostHistoryChart
          snapshots={product.cost_snapshots.map((s) => ({
            id: s.id,
            total_cost: s.total_cost,
            snapshotted_at: s.snapshotted_at.toISOString(),
          }))}
          sellingPrice={product.retail_price}
        />
      </Card>
    </div>
  )
}
