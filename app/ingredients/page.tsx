import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { getIngredientStockLevels } from '@/lib/stock-calculator'
import { IngredientsTable, type IngredientRow } from '@/components/ingredients/IngredientsTable'

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const [ingredients, stockLevels] = await Promise.all([
    prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { recipe_components: true } } },
    }),
    getIngredientStockLevels(prisma),
  ])

  const rows: IngredientRow[] = ingredients.map((i) => {
    const stock = stockLevels.get(i.id) ?? null
    return {
      id: i.id,
      name: i.name,
      unit: i.unit,
      yield_percentage: i.yield_percentage,
      current_price_per_unit: i.current_price_per_unit,
      par_level: i.par_level,
      par_unit: i.par_unit,
      recipe_components_count: i._count.recipe_components,
      stockStatus: stock ? stock.status : (i.par_level !== null ? 'no_count' : null),
      currentStock: stock ? stock.counted_quantity : null,
      suggestedOrder: stock ? stock.suggested_order : (i.par_level !== null ? i.par_level : null),
    }
  })

  return (
    <div>
      <PageHeader
        title="Ingredients"
        description="Manage your ingredient library and pricing"
        action={{ label: '+ New Ingredient', href: '/ingredients/new' }}
      />
      {ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          description="Add ingredients before creating recipes."
          action={{ label: '+ New Ingredient', href: '/ingredients/new' }}
        />
      ) : (
        <IngredientsTable rows={rows} initialFilter={filter === 'low' ? 'low' : filter === 'critical' ? 'critical' : 'all'} />
      )}
    </div>
  )
}
