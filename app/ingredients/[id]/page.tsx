import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

export default async function IngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: parseInt(id) },
    include: {
      price_history: {
        orderBy: { recorded_at: 'desc' },
        take: 50,
        include: { invoice: { select: { id: true, reference: true, invoice_date: true } } },
      },
      _count: { select: { recipe_components: true } },
    },
  })
  if (!ingredient) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={ingredient.name}
        description={ingredient.description ?? undefined}
        action={{ label: 'Edit', href: `/ingredients/${id}/edit` }}
      />

      {(() => {
        const yp = ingredient.yield_percentage ?? 100
        const yieldColor = yp >= 95 ? 'bg-green-100 text-green-700' : yp >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        const effectivePrice = ingredient.current_price_per_unit !== null && yp > 0
          ? ingredient.current_price_per_unit / (yp / 100)
          : null
        return (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-slate-500">Current price</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {ingredient.current_price_per_unit !== null
                  ? `£${ingredient.current_price_per_unit.toFixed(4)}`
                  : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">per {ingredient.unit}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Yield</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-semibold ${yieldColor}`}>
                  {yp % 1 === 0 ? yp.toFixed(0) : yp.toFixed(1)}%
                </span>
              </div>
              {ingredient.prep_loss_notes && (
                <p className="text-xs text-slate-400 mt-1.5">{ingredient.prep_loss_notes}</p>
              )}
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Effective cost</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">
                {effectivePrice !== null ? `£${effectivePrice.toFixed(4)}` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">per {ingredient.unit} usable</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Used in</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{ingredient._count.recipe_components}</p>
              <p className="text-xs text-slate-400 mt-1">{ingredient._count.recipe_components === 1 ? 'recipe' : 'recipes'}</p>
            </Card>
          </div>
        )
      })()}

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Price History</h2>
        {ingredient.price_history.length === 0 ? (
          <p className="text-sm text-slate-400">No price history yet — enter an invoice to record prices.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600">Date</th>
                <th className="text-left py-2 font-semibold text-slate-600">Invoice</th>
                <th className="text-right py-2 font-semibold text-slate-600">Price per {ingredient.unit}</th>
              </tr>
            </thead>
            <tbody>
              {ingredient.price_history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 text-slate-600">
                    {new Date(h.recorded_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-3 text-slate-600">
                    {h.invoice ? (
                      <Link href={`/invoices/${h.invoice.id}`} className="hover:text-blue-600">
                        {h.invoice.reference ?? `Invoice #${h.invoice.id}`}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-900">
                    £{h.price_per_unit.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
