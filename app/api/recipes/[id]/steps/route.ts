import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createStepSchema = z.object({
  step_number: z.number().int().positive(),
  instruction: z.string().default(''),
  duration_mins: z.number().int().positive().nullable().optional(),
  photo_url: z.string().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const steps = await prisma.recipeStep.findMany({
    where: { recipe_id: parseInt(id) },
    orderBy: { step_number: 'asc' },
  })
  return NextResponse.json(steps)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const data = createStepSchema.parse(body)
    const step = await prisma.recipeStep.create({
      data: { ...data, recipe_id: parseInt(id) },
    })
    return NextResponse.json(step, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create step' }, { status: 500 })
  }
}
