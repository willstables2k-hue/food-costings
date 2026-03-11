import type { PrismaClient } from '@prisma/client'
import { getConversionFactor } from './unit-converter'
import { calculateRecipeCost } from './cost-calculator'

export interface InvoiceLineItemInput {
  ingredient_id: number
  quantity: number
  purchase_unit: string
  total_cost: number
}

export interface CreateInvoiceInput {
  supplier_id: number
  invoice_date: Date
  reference?: string
  notes?: string
  line_items: InvoiceLineItemInput[]
}

export interface ProcessInvoiceResult {
  invoice: { id: number; supplier_id: number; invoice_date: Date; reference: string | null }
  affected_products: number[]
  snapshots_created: number
}

export async function processInvoice(
  input: CreateInvoiceInput,
  prisma: PrismaClient
): Promise<ProcessInvoiceResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Create Invoice record
    const invoice = await tx.invoice.create({
      data: {
        supplier_id: input.supplier_id,
        invoice_date: input.invoice_date,
        reference: input.reference,
        notes: input.notes,
      },
    })

    const touchedIngredientIds = new Set<number>()

    // 2. Process each line item
    for (const item of input.line_items) {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: item.ingredient_id },
      })

      if (!ingredient) continue

      let conversionFactor = 1
      try {
        conversionFactor = getConversionFactor(item.purchase_unit, ingredient.unit)
      } catch {
        conversionFactor = 1
      }

      const quantityInCanonical = item.quantity * conversionFactor
      const pricePerCanonical = quantityInCanonical > 0
        ? item.total_cost / quantityInCanonical
        : 0

      // Create line item
      await tx.invoiceLineItem.create({
        data: {
          invoice_id: invoice.id,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
          purchase_unit: item.purchase_unit,
          total_cost: item.total_cost,
          price_per_canonical_unit: pricePerCanonical,
        },
      })

      // Create price history
      await tx.ingredientPriceHistory.create({
        data: {
          ingredient_id: item.ingredient_id,
          price_per_unit: pricePerCanonical,
          invoice_id: invoice.id,
        },
      })

      // Update current price
      await tx.ingredient.update({
        where: { id: item.ingredient_id },
        data: { current_price_per_unit: pricePerCanonical },
      })

      touchedIngredientIds.add(item.ingredient_id)
    }

    // 3. BFS to find all affected products
    const affectedProductIds = new Set<number>()
    const ingredientIds = Array.from(touchedIngredientIds)

    // Find all recipe components using touched ingredients
    const directComponents = await tx.recipeComponent.findMany({
      where: { ingredient_id: { in: ingredientIds } },
      select: { recipe_id: true },
    })

    const recipeQueue = new Set<number>(directComponents.map((c) => c.recipe_id))
    const visitedRecipes = new Set<number>()

    // BFS up the recipe tree
    while (recipeQueue.size > 0) {
      const currentId = recipeQueue.values().next().value!
      recipeQueue.delete(currentId)

      if (visitedRecipes.has(currentId)) continue
      visitedRecipes.add(currentId)

      // Check if this recipe has a product
      const product = await tx.product.findFirst({
        where: { recipe_id: currentId, is_active: true },
      })
      if (product) affectedProductIds.add(product.id)

      // Find parent recipes that use this as sub-recipe
      const parentComponents = await tx.recipeComponent.findMany({
        where: { sub_recipe_id: currentId },
        select: { recipe_id: true },
      })
      for (const pc of parentComponents) {
        if (!visitedRecipes.has(pc.recipe_id)) {
          recipeQueue.add(pc.recipe_id)
        }
      }
    }

    // 4. Create cost snapshots for each affected product
    let snapshotsCreated = 0
    for (const productId of affectedProductIds) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { recipe_id: true },
      })
      if (!product) continue

      try {
        const breakdown = await calculateRecipeCost(product.recipe_id, prisma as PrismaClient)
        await tx.costSnapshot.create({
          data: {
            product_id: productId,
            total_cost: breakdown.total_cost,
            breakdown_json: JSON.stringify(breakdown),
            triggered_by_invoice_id: invoice.id,
          },
        })
        snapshotsCreated++
      } catch (err) {
        console.error(`Failed to calculate cost for product ${productId}:`, err)
      }
    }

    return {
      invoice: {
        id: invoice.id,
        supplier_id: invoice.supplier_id,
        invoice_date: invoice.invoice_date,
        reference: invoice.reference,
      },
      affected_products: Array.from(affectedProductIds),
      snapshots_created: snapshotsCreated,
    }
  })
}
