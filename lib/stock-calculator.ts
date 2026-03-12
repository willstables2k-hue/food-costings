import type { PrismaClient } from '@prisma/client'
import { getConversionFactor } from './unit-converter'

export type StockStatus = 'ok' | 'low' | 'critical' | 'no_count'

export interface StockLevel {
  counted_quantity: number   // in par_unit (or ingredient unit if no par_unit)
  unit: string
  value: number              // stock value in £
  par_level: number
  par_unit: string
  status: StockStatus
  suggested_order: number    // max(0, par_level - counted_quantity)
}

/**
 * Returns stock levels for all ingredients that have a par_level set.
 * Uses the most recently submitted StockCount as the source of current quantities.
 * If no submitted count exists, all statuses are 'no_count'.
 */
export async function getIngredientStockLevels(
  prisma: PrismaClient
): Promise<Map<number, StockLevel>> {
  const result = new Map<number, StockLevel>()

  // Fetch all ingredients with a par_level
  const ingredients = await prisma.ingredient.findMany({
    where: { par_level: { not: null } },
    select: { id: true, par_level: true, par_unit: true, unit: true, current_price_per_unit: true },
  })

  if (ingredients.length === 0) return result

  // Find the most recently submitted count
  const latestCount = await prisma.stockCount.findFirst({
    where: { status: 'submitted' },
    orderBy: { counted_at: 'desc' },
    include: {
      lines: {
        select: { ingredient_id: true, counted_quantity: true, unit: true },
      },
    },
  })

  // Build a fast lookup: ingredient_id → line
  const lineByIngredient = new Map(
    (latestCount?.lines ?? []).map((l) => [l.ingredient_id, l])
  )

  for (const ing of ingredients) {
    const par = ing.par_level!
    const parUnit = ing.par_unit ?? ing.unit
    const line = lineByIngredient.get(ing.id)

    if (!latestCount || !line) {
      result.set(ing.id, {
        counted_quantity: 0,
        unit: parUnit,
        value: 0,
        par_level: par,
        par_unit: parUnit,
        status: 'no_count',
        suggested_order: par,
      })
      continue
    }

    // Convert counted quantity into par_unit for comparison
    let countedInParUnit = line.counted_quantity
    try {
      countedInParUnit = line.counted_quantity * getConversionFactor(line.unit, parUnit)
    } catch {
      // Units incompatible — use counted value as-is
    }

    // Calculate stock value using canonical unit price
    let value = 0
    if (ing.current_price_per_unit !== null) {
      try {
        const toCanonical = getConversionFactor(line.unit, ing.unit)
        value = line.counted_quantity * toCanonical * ing.current_price_per_unit
      } catch { /* incompatible units */ }
    }

    const status: StockStatus =
      countedInParUnit >= par ? 'ok'
      : countedInParUnit < par * 0.5 ? 'critical'
      : 'low'

    result.set(ing.id, {
      counted_quantity: countedInParUnit,
      unit: parUnit,
      value,
      par_level: par,
      par_unit: parUnit,
      status,
      suggested_order: Math.max(0, par - countedInParUnit),
    })
  }

  return result
}
