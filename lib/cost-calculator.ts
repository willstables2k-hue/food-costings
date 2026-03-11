import type { PrismaClient } from '@prisma/client'
import type { CostBreakdown, CostBreakdownNode } from '@/types/cost'
import { getConversionFactor } from './unit-converter'

export class CircularDependencyError extends Error {
  constructor(recipeId: number) {
    super(`Circular dependency detected involving recipe ID ${recipeId}`)
    this.name = 'CircularDependencyError'
  }
}

export async function calculateRecipeCost(
  recipeId: number,
  prisma: PrismaClient,
  visited: Set<number> = new Set()
): Promise<CostBreakdown> {
  if (visited.has(recipeId)) {
    throw new CircularDependencyError(recipeId)
  }

  const newVisited = new Set(visited)
  newVisited.add(recipeId)

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      components: {
        include: {
          ingredient: true,
          sub_recipe: true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)

  const components: CostBreakdownNode[] = []
  let totalCost = 0

  for (const component of recipe.components) {
    if (component.ingredient_id && component.ingredient) {
      const ingredient = component.ingredient
      const unitCost = ingredient.current_price_per_unit ?? 0

      let conversionFactor = 1
      try {
        conversionFactor = getConversionFactor(component.unit, ingredient.unit)
      } catch {
        // If units can't be converted, treat as 1:1
        conversionFactor = 1
      }

      const quantityInCanonical = component.quantity * conversionFactor
      const lineCost = quantityInCanonical * unitCost

      components.push({
        type: 'ingredient',
        id: ingredient.id,
        name: ingredient.name,
        quantity: component.quantity,
        unit: component.unit,
        unit_cost: unitCost,
        line_cost: lineCost,
      })

      totalCost += lineCost
    } else if (component.sub_recipe_id && component.sub_recipe) {
      const subRecipe = component.sub_recipe
      const subBreakdown = await calculateRecipeCost(subRecipe.id, prisma, newVisited)

      let conversionFactor = 1
      try {
        conversionFactor = getConversionFactor(component.unit, subRecipe.yield_unit)
      } catch {
        conversionFactor = 1
      }

      const quantityInYieldUnit = component.quantity * conversionFactor
      const fraction = subBreakdown.yield_quantity > 0
        ? quantityInYieldUnit / subBreakdown.yield_quantity
        : 0
      const lineCost = fraction * subBreakdown.total_cost

      components.push({
        type: 'sub_recipe',
        id: subRecipe.id,
        name: subRecipe.name,
        quantity: component.quantity,
        unit: component.unit,
        unit_cost: subBreakdown.yield_quantity > 0
          ? subBreakdown.total_cost / subBreakdown.yield_quantity
          : 0,
        line_cost: lineCost,
        sub_breakdown: subBreakdown.components,
        sub_recipe_yield_quantity: subBreakdown.yield_quantity,
        sub_recipe_yield_unit: subBreakdown.yield_unit,
      })

      totalCost += lineCost
    }
  }

  return {
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    total_cost: totalCost,
    yield_quantity: recipe.yield_quantity,
    yield_unit: recipe.yield_unit,
    cost_per_yield_unit: recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0,
    components,
    calculated_at: new Date().toISOString(),
  }
}
