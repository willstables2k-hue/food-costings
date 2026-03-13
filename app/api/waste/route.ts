import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { wasteLogSchema } from '@/lib/validations/waste'
import { calculateRecipeCost } from '@/lib/cost-calculator'
import { getConversionFactor } from '@/lib/unit-converter'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const ingredientId = searchParams.get('ingredient_id')
  const reason = searchParams.get('reason')

  const where: Record<string, unknown> = {}

  if (from || to) {
    where.logged_at = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  }
  if (ingredientId) where.ingredient_id = parseInt(ingredientId)
  if (reason) where.reason = reason

  const logs = await prisma.wasteLog.findMany({
    where,
    include: {
      ingredient: { select: { id: true, name: true, unit: true } },
      recipe: { select: { id: true, name: true, yield_unit: true } },
    },
    orderBy: { logged_at: 'desc' },
  })

  return NextResponse.json(logs)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = wasteLogSchema.parse(body)

    let costAtLog: number | null = null

    if (data.ingredient_id) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: data.ingredient_id },
      })
      if (ingredient?.current_price_per_unit != null) {
        let conversionFactor = 1
        try {
          conversionFactor = getConversionFactor(data.unit, ingredient.unit)
        } catch {
          conversionFactor = 1
        }
        costAtLog = data.quantity * conversionFactor * ingredient.current_price_per_unit
      }
    } else if (data.recipe_id) {
      try {
        const breakdown = await calculateRecipeCost(data.recipe_id, prisma)
        if (breakdown.cost_per_yield_unit > 0) {
          let conversionFactor = 1
          try {
            conversionFactor = getConversionFactor(data.unit, breakdown.yield_unit)
          } catch {
            conversionFactor = 1
          }
          costAtLog = data.quantity * conversionFactor * breakdown.cost_per_yield_unit
        }
      } catch {
        // Cost can't be calculated — leave null
      }
    }

    const log = await prisma.wasteLog.create({
      data: {
        ingredient_id: data.ingredient_id ?? null,
        recipe_id: data.recipe_id ?? null,
        quantity: data.quantity,
        unit: data.unit,
        reason: data.reason,
        notes: data.notes ?? null,
        cost_at_log: costAtLog,
      },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        recipe: { select: { id: true, name: true, yield_unit: true } },
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create waste log' }, { status: 500 })
  }
}
