import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { calculateRecipeAllergens } from '@/lib/allergen-calculator'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CostBreakdownTree } from '@/components/cost/CostBreakdownTree'
import { RecipeStepEditor } from '@/components/forms/RecipeStepEditor'
import { RecipePrintCard } from '@/components/recipe/RecipePrintCard'

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
      steps: { orderBy: { step_number: 'asc' } },
    },
  })
  if (!recipe) notFound()

  let costBreakdown = null
  try {
    costBreakdown = await calculateRecipeCost(recipe.id, prisma)
  } catch {
    // Prices not set yet — cost can't be calculated
  }

  let allergenKeys: Set<string> = new Set()
  let allergenDisplayMap: Record<string, string> = {}
  try {
    allergenKeys = await calculateRecipeAllergens(recipe.id, prisma)
    if (allergenKeys.size > 0) {
      const allergens = await prisma.allergen.findMany({
        where: { key: { in: Array.from(allergenKeys) } },
      })
      allergenDisplayMap = Object.fromEntries(allergens.map((a) => [a.key, a.display_name]))
    }
  } catch {
    // Allergen calculation failed — skip display
  }

  const printComponents = recipe.components.map((c) => ({
    name: c.ingredient?.name ?? c.sub_recipe?.name ?? 'Unknown',
    isSubRecipe: !!c.sub_recipe_id,
    quantity: c.quantity,
    unit: c.unit,
  }))

  const printSteps = recipe.steps.map((s) => ({
    step_number: s.step_number,
    instruction: s.instruction,
    duration_mins: s.duration_mins,
  }))

  return (
    <div className="space-y-6">
      {/* Print card — hidden on screen, visible on print */}
      <RecipePrintCard
        recipe={{
          name: recipe.name,
          description: recipe.description,
          yield_quantity: recipe.yield_quantity,
          yield_unit: recipe.yield_unit,
        }}
        costPerYieldUnit={costBreakdown?.cost_per_yield_unit ?? null}
        components={printComponents}
        steps={printSteps}
      />

      {/* Screen content — hidden on print */}
      <div className="print-hidden space-y-6">
        <div className="flex items-start justify-between">
          <PageHeader
            title={recipe.name}
            description={recipe.description ?? undefined}
            action={{ label: 'Edit', href: `/recipes/${id}/edit` }}
          />
        </div>

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

        {allergenKeys.size > 0 && (
          <Card>
            <h2 className="text-base font-semibold text-slate-900 mb-3">Allergens</h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(allergenKeys).sort().map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                >
                  ⚠️ {allergenDisplayMap[key] ?? key}
                </span>
              ))}
            </div>
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

        <RecipeStepEditor recipeId={recipe.id} initialSteps={recipe.steps} />
      </div>
    </div>
  )
}
