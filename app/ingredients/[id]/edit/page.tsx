import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { IngredientForm } from '@/components/forms/IngredientForm'

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ingredient = await prisma.ingredient.findUnique({ where: { id: parseInt(id) } })
  if (!ingredient) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${ingredient.name}`} />
      <IngredientForm
        ingredientId={ingredient.id}
        defaultValues={{
          name: ingredient.name,
          description: ingredient.description ?? undefined,
          unit: ingredient.unit,
        }}
      />
    </div>
  )
}
