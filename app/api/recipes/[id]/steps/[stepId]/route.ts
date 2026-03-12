import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateStepSchema = z.object({
  step_number: z.number().int().positive(),
  instruction: z.string(),
  duration_mins: z.number().int().positive().nullable().optional(),
  photo_url: z.string().nullable().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  try {
    const body = await request.json()
    const data = updateStepSchema.parse(body)
    const step = await prisma.recipeStep.update({
      where: { id: parseInt(stepId) },
      data,
    })
    return NextResponse.json(step)
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { stepId } = await params
  try {
    await prisma.recipeStep.delete({ where: { id: parseInt(stepId) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 })
  }
}
