import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductForm } from '@/components/forms/ProductForm'

export default async function NewProductPage() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, is_sub_recipe: true },
  })

  return (
    <div>
      <PageHeader title="New Product" />
      <ProductForm recipes={recipes} />
    </div>
  )
}
