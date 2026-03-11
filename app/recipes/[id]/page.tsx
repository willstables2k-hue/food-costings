import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CostBreakdownTree } from '@/components/cost/CostBreakdownTree'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id: parseInt(id) },
    include: {
      components: {
        include: { ingredient: true, sub_recipe: true },
        orderBy: { sort_order: 'asc' },
      },
      product: true,
    },
  })
  if (!recipe) notFound()

  let costBreakdown = null
  try {
    costBreakdown = await calculateRecipeCost(recipe.id, prisma)
  } catch {
    // Prices not set yet — cost can't be calculated
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={recipe.name}
        description={recipe.description ?? undefined}
        action={{ label: 'Edit', href: `/recipes/${id}/edit` }}
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Type</p>
          <div className="mt-2">
            <Badge variant={recipe.is_sub_recipe ? 'blue' : 'gray'}>
              {recipe.is_sub_recipe ? 'Sub-recipe' : 'Recipe'}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Yield</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {recipe.yield_quantity} {recipe.yield_unit}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Cost per {recipe.yield_unit}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {costBreakdown ? `£${costBreakdown.cost_per_yield_unit.toFixed(4)}` : '—'}
          </p>
        </Card>
      </div>

      {recipe.product && (
        <Card>
          <p className="text-xs text-slate-500 mb-1">Linked product</p>
          <Link href={`/products/${recipe.product.id}`} className="font-medium text-slate-900 hover:text-blue-600">
            {recipe.product.name}
          </Link>
        </Card>
      )}

      {costBreakdown ? (
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
      ) : (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            Components ({recipe.components.length})
          </h2>
          {recipe.components.length === 0 ? (
            <p className="text-sm text-slate-400">No components yet. <Link href={`/recipes/${id}/edit`} className="text-blue-600 hover:underline">Add ingredients</Link> to this recipe.</p>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-3">Enter an invoice to price these ingredients and see cost calculations.</p>
              <div className="space-y-1">
                {recipe.components.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-700">
                      {c.ingredient?.name ?? c.sub_recipe?.name ?? 'Unknown'}
                      {c.sub_recipe && (
                        <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">sub-recipe</span>
                      )}
                    </span>
                    <span className="text-sm text-slate-500">{c.quantity} {c.unit}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
