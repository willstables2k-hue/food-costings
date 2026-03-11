import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function IngredientsPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { recipe_components: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Ingredients"
        description="Manage your ingredient library and pricing"
        action={{ label: '+ New Ingredient', href: '/ingredients/new' }}
      />
      {ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          description="Add ingredients before creating recipes."
          action={{ label: '+ New Ingredient', href: '/ingredients/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Unit</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Current price</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Used in</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/ingredients/${i.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">per {i.unit}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-900">
                    {i.current_price_per_unit !== null
                      ? `£${i.current_price_per_unit.toFixed(4)}`
                      : <span className="text-slate-400">No price yet</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {i._count.recipe_components} {i._count.recipe_components === 1 ? 'recipe' : 'recipes'}
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
