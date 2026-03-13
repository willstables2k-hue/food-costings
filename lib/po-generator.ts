import type { PrismaClient } from '@prisma/client'
import { getIngredientStockLevels } from './stock-calculator'

export interface SuggestedPOLine {
  ingredient_id: number
  ingredient_name: string
  quantity: number        // suggested order (par_level - current_stock), in canonical unit
  unit: string            // ingredient canonical unit
  last_unit_price: number | null  // price_per_canonical_unit from most recent invoice
  stock_status: 'low' | 'critical'
}

/**
 * Generates suggested PO lines for a given supplier.
 * An ingredient is associated with a supplier if the most recent invoice line item
 * for that ingredient was from an invoice raised against that supplier.
 * Only ingredients with 'low' or 'critical' stock status are included.
 */
export async function generatePOLines(
  supplierId: number,
  prisma: PrismaClient
): Promise<SuggestedPOLine[]> {
  // Find the most recent InvoiceLineItem per ingredient for invoices from this supplier.
  // We use a subquery pattern: get all line items for this supplier, ordered by invoice date desc,
  // then pick the first per ingredient.
  const supplierLineItems = await prisma.invoiceLineItem.findMany({
    where: {
      invoice: { supplier_id: supplierId },
    },
    orderBy: { invoice: { invoice_date: 'desc' } },
    include: {
      ingredient: { select: { id: true, name: true, unit: true } },
    },
  })

  // Deduplicate: keep only the most recent line item per ingredient
  const latestByIngredient = new Map<number, typeof supplierLineItems[number]>()
  for (const item of supplierLineItems) {
    if (!latestByIngredient.has(item.ingredient_id)) {
      latestByIngredient.set(item.ingredient_id, item)
    }
  }

  if (latestByIngredient.size === 0) return []

  // Get stock levels for all ingredients with par levels
  const stockLevels = await getIngredientStockLevels(prisma)

  const suggestions: SuggestedPOLine[] = []

  for (const [ingredientId, lineItem] of latestByIngredient) {
    const stock = stockLevels.get(ingredientId)
    if (!stock) continue  // no par level set — skip
    if (stock.status !== 'low' && stock.status !== 'critical') continue

    suggestions.push({
      ingredient_id: ingredientId,
      ingredient_name: lineItem.ingredient.name,
      quantity: Math.ceil(stock.suggested_order * 100) / 100,  // round up to 2dp
      unit: lineItem.ingredient.unit,
      last_unit_price: lineItem.price_per_canonical_unit,
      stock_status: stock.status as 'low' | 'critical',
    })
  }

  // Sort critical first, then by ingredient name
  return suggestions.sort((a, b) => {
    if (a.stock_status !== b.stock_status) {
      return a.stock_status === 'critical' ? -1 : 1
    }
    return a.ingredient_name.localeCompare(b.ingredient_name)
  })
}
