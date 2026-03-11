import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductForm } from '@/components/forms/ProductForm'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [product, recipes] = await Promise.all([
    prisma.product.findUnique({ where: { id: parseInt(id) } }),
    prisma.recipe.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, is_sub_recipe: true },
    }),
  ])
  if (!product) notFound()

  return (
    <div>
      <PageHeader title={`Edit ${product.name}`} />
      <ProductForm
        productId={product.id}
        recipes={recipes}
        defaultValues={{
          name: product.name,
          description: product.description ?? undefined,
          recipe_id: product.recipe_id,
          selling_price: product.selling_price ?? undefined,
          selling_unit: product.selling_unit ?? undefined,
          is_active: product.is_active,
        }}
      />
    </div>
  )
}
