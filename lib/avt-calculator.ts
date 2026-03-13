import type { PrismaClient } from '@prisma/client'
import { calculateRecipeCost } from './cost-calculator'
import { getConversionFactor } from './unit-converter'

export interface AvtProductLine {
  product_id: number
  product_name: string
  qty_sold: number
  theoretical_cost: number
}

export interface AvtResult {
  from: Date
  to: Date
  opening_stock_value: number
  closing_stock_value: number
  purchases_total: number
  actual_cost: number
  theoretical_cost: number
  variance: number
  variance_pct: number
  sales_by_product: AvtProductLine[]
  warnings: string[]
  opening_count_date: Date | null
  closing_count_date: Date | null
}

function valueStockCount(
  lines: {
    counted_quantity: number
    unit: string
    ingredient: { unit: string; current_price_per_unit: number | null }
  }[]
): number {
  return lines.reduce((sum, line) => {
    if (line.ingredient.current_price_per_unit === null) return sum
    let factor = 1
    try {
      factor = getConversionFactor(line.unit, line.ingredient.unit)
    } catch { /* incompatible units — skip */ }
    return sum + line.counted_quantity * factor * line.ingredient.current_price_per_unit
  }, 0)
}

export async function calculateAvT(
  from: Date,
  to: Date,
  prisma: PrismaClient
): Promise<AvtResult> {
  const warnings: string[] = []

  // Opening stock: most recent submitted count BEFORE `from`
  const openingCount = await prisma.stockCount.findFirst({
    where: { status: 'submitted', counted_at: { lt: from } },
    orderBy: { counted_at: 'desc' },
    include: {
      lines: {
        include: { ingredient: { select: { unit: true, current_price_per_unit: true } } },
      },
    },
  })
  if (!openingCount) {
    warnings.push('No submitted stock count found before the period start — opening stock value set to £0.')
  }

  // Closing stock: earliest submitted count AT OR AFTER `to`
  const closingCount = await prisma.stockCount.findFirst({
    where: { status: 'submitted', counted_at: { gte: to } },
    orderBy: { counted_at: 'asc' },
    include: {
      lines: {
        include: { ingredient: { select: { unit: true, current_price_per_unit: true } } },
      },
    },
  })
  if (!closingCount) {
    warnings.push('No submitted stock count found at or after the period end — closing stock value set to £0.')
  }

  const opening_stock_value = openingCount ? valueStockCount(openingCount.lines) : 0
  const closing_stock_value = closingCount ? valueStockCount(closingCount.lines) : 0

  // Purchases in period: sum InvoiceLineItem.total_cost where invoice_date is within range
  const invoiceLines = await prisma.invoiceLineItem.findMany({
    where: {
      invoice: { invoice_date: { gte: from, lte: to } },
    },
    select: { total_cost: true },
  })
  const purchases_total = invoiceLines.reduce((s, l) => s + l.total_cost, 0)

  const actual_cost = opening_stock_value + purchases_total - closing_stock_value

  // Sales entries in period
  const salesEntries = await prisma.salesEntry.findMany({
    where: { period_date: { gte: from, lte: to } },
    include: {
      product: { select: { id: true, name: true, recipe_id: true } },
    },
  })

  // Aggregate sales by product
  const byProduct = new Map<
    number,
    { product_id: number; product_name: string; recipe_id: number; qty_sold: number }
  >()
  for (const entry of salesEntries) {
    const existing = byProduct.get(entry.product_id)
    if (existing) {
      existing.qty_sold += entry.quantity
    } else {
      byProduct.set(entry.product_id, {
        product_id: entry.product_id,
        product_name: entry.product.name,
        recipe_id: entry.product.recipe_id,
        qty_sold: entry.quantity,
      })
    }
  }

  // Calculate theoretical cost per product using current recipe costs
  const sales_by_product: AvtProductLine[] = []
  let theoretical_cost = 0

  for (const [, p] of byProduct) {
    try {
      const breakdown = await calculateRecipeCost(p.recipe_id, prisma)
      const cost = breakdown.cost_per_yield_unit * p.qty_sold
      sales_by_product.push({
        product_id: p.product_id,
        product_name: p.product_name,
        qty_sold: p.qty_sold,
        theoretical_cost: cost,
      })
      theoretical_cost += cost
    } catch {
      warnings.push(
        `Could not calculate cost for product "${p.product_name}" — excluded from theoretical total.`
      )
    }
  }

  // Sort by highest theoretical cost first
  sales_by_product.sort((a, b) => b.theoretical_cost - a.theoretical_cost)

  const variance = actual_cost - theoretical_cost
  const variance_pct = theoretical_cost > 0 ? (variance / theoretical_cost) * 100 : 0

  return {
    from,
    to,
    opening_stock_value,
    closing_stock_value,
    purchases_total,
    actual_cost,
    theoretical_cost,
    variance,
    variance_pct,
    sales_by_product,
    warnings,
    opening_count_date: openingCount?.counted_at ?? null,
    closing_count_date: closingCount?.counted_at ?? null,
  }
}
