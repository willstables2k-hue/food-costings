import type { PrismaClient } from '@prisma/client'
import { calculateRecipeCost } from './cost-calculator'

export type MenuCategory = 'star' | 'puzzle' | 'plowhorse' | 'dog'

export interface MenuProduct {
  product_id: number
  product_name: string
  units_sold: number
  cost_per_unit: number
  price: number
  contribution_margin: number
  cm_pct: number
  revenue: number
  total_contribution: number
  category: MenuCategory
  above_avg_popularity: boolean
  above_avg_margin: boolean
}

export interface MenuEngineeringResult {
  products: MenuProduct[]
  avg_units_sold: number
  avg_contribution_margin: number
  from: Date
  to: Date
  excluded: { product_name: string; reason: string }[]
}

export const CATEGORY_META: Record<
  MenuCategory,
  { label: string; emoji: string; description: string; action: string }
> = {
  star:      { label: 'Star',      emoji: '⭐', description: 'High popularity, high margin', action: 'Promote heavily' },
  puzzle:    { label: 'Puzzle',    emoji: '🧩', description: 'Low popularity, high margin',  action: 'Improve marketing or simplify' },
  plowhorse: { label: 'Plowhorse', emoji: '🐴', description: 'High popularity, low margin',  action: 'Increase price or reduce cost' },
  dog:       { label: 'Dog',       emoji: '🐕', description: 'Low popularity, low margin',   action: 'Consider removing' },
}

export async function calculateMenuEngineering(
  from: Date,
  to: Date,
  prisma: PrismaClient
): Promise<MenuEngineeringResult> {
  const excluded: { product_name: string; reason: string }[] = []

  const products = await prisma.product.findMany({
    where: { is_active: true },
    select: { id: true, name: true, recipe_id: true, retail_price: true, wholesale_price: true },
  })

  // Aggregate sales by product for the period
  const salesEntries = await prisma.salesEntry.findMany({
    where: { period_date: { gte: from, lte: to } },
    select: { product_id: true, quantity: true },
  })
  const salesByProduct = new Map<number, number>()
  for (const e of salesEntries) {
    salesByProduct.set(e.product_id, (salesByProduct.get(e.product_id) ?? 0) + e.quantity)
  }

  const eligible: MenuProduct[] = []

  for (const product of products) {
    const price = product.retail_price ?? product.wholesale_price
    if (!price || price <= 0) {
      excluded.push({ product_name: product.name, reason: 'No selling price set' })
      continue
    }

    const units_sold = salesByProduct.get(product.id) ?? 0
    if (units_sold === 0) {
      excluded.push({ product_name: product.name, reason: 'No sales recorded in period' })
      continue
    }

    let cost_per_unit: number
    try {
      const breakdown = await calculateRecipeCost(product.recipe_id, prisma)
      cost_per_unit = breakdown.cost_per_yield_unit
    } catch {
      excluded.push({ product_name: product.name, reason: 'Could not calculate recipe cost' })
      continue
    }

    const contribution_margin = price - cost_per_unit
    const cm_pct = price > 0 ? (contribution_margin / price) * 100 : 0

    eligible.push({
      product_id: product.id,
      product_name: product.name,
      units_sold,
      cost_per_unit,
      price,
      contribution_margin,
      cm_pct,
      revenue: units_sold * price,
      total_contribution: units_sold * contribution_margin,
      category: 'dog', // assigned below
      above_avg_popularity: false,
      above_avg_margin: false,
    })
  }

  const avg_units_sold = eligible.length
    ? eligible.reduce((s, p) => s + p.units_sold, 0) / eligible.length
    : 0
  const avg_contribution_margin = eligible.length
    ? eligible.reduce((s, p) => s + p.contribution_margin, 0) / eligible.length
    : 0

  for (const p of eligible) {
    p.above_avg_popularity = p.units_sold >= avg_units_sold
    p.above_avg_margin = p.contribution_margin >= avg_contribution_margin

    if (p.above_avg_popularity && p.above_avg_margin)       p.category = 'star'
    else if (!p.above_avg_popularity && p.above_avg_margin) p.category = 'puzzle'
    else if (p.above_avg_popularity && !p.above_avg_margin) p.category = 'plowhorse'
    else                                                     p.category = 'dog'
  }

  return { products: eligible, avg_units_sold, avg_contribution_margin, from, to, excluded }
}
