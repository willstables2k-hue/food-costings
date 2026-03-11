import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { components: true } },
      product: { select: { id: true, name: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Recipes"
        description="Build recipes from ingredients and sub-recipes"
        action={{ label: '+ New Recipe', href: '/recipes/new' }}
      />
      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          description="Create a recipe to start calculating ingredient costs."
          action={{ label: '+ New Recipe', href: '/recipes/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Yield</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Components</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/recipes/${r.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={r.is_sub_recipe ? 'blue' : 'gray'}>
                      {r.is_sub_recipe ? 'Sub-recipe' : 'Recipe'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {r.yield_quantity} {r.yield_unit}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">{r._count.components}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {r.product ? (
                      <Link href={`/products/${r.product.id}`} className="hover:text-blue-600">
                        {r.product.name}
                      </Link>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
