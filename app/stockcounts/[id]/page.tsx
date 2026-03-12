import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StockCountActions } from '@/components/stockcount/StockCountActions'
import { getConversionFactor } from '@/lib/unit-converter'

function calcLineValue(
  counted_quantity: number,
  countUnit: string,
  ingredient: { current_price_per_unit: number | null; unit: string }
): number {
  if (ingredient.current_price_per_unit === null) return 0
  let factor = 1
  try { factor = getConversionFactor(countUnit, ingredient.unit) } catch { /* incompatible */ }
  return counted_quantity * factor * ingredient.current_price_per_unit
}

export default async function StockCountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const count = await prisma.stockCount.findUnique({
    where: { id: parseInt(id) },
    include: {
      lines: {
        include: { ingredient: true },
        orderBy: { ingredient: { name: 'asc' } },
      },
    },
  })
  if (!count) notFound()

  const linesWithValue = count.lines.map((l) => ({
    ...l,
    line_value: calcLineValue(l.counted_quantity, l.unit, l.ingredient),
  }))
  const totalValue = linesWithValue.reduce((s, l) => s + l.line_value, 0)
  const countedAtStr = count.counted_at.toISOString().split('T')[0]

  const csvLines = linesWithValue.map((l) => ({
    ingredientName: l.ingredient.name,
    counted_quantity: l.counted_quantity,
    unit: l.unit,
    price_per_unit: l.ingredient.current_price_per_unit,
    line_value: l.line_value,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={count.name}
        description={count.notes ?? undefined}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-2">
            <Badge variant={count.status === 'submitted' ? 'green' : 'gray'}>
              {count.status === 'submitted' ? 'Submitted' : 'Draft'}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Date</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {new Date(count.counted_at).toLocaleDateString('en-GB')}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Lines counted</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{count.lines.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total stock value</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">£{totalValue.toFixed(2)}</p>
        </Card>
      </div>

      {/* Actions */}
      <StockCountActions
        countId={count.id}
        status={count.status}
        countName={count.name}
        countedAt={countedAtStr}
        csvLines={csvLines}
      />

      {/* Lines table */}
      <Card padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Ingredient</th>
              <th className="text-right px-6 py-3 font-semibold text-slate-600">Counted qty</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Unit</th>
              <th className="text-right px-6 py-3 font-semibold text-slate-600">Price / unit</th>
              <th className="text-right px-6 py-3 font-semibold text-slate-600">Line value</th>
            </tr>
          </thead>
          <tbody>
            {linesWithValue.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900">{l.ingredient.name}</td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">{l.counted_quantity}</td>
                <td className="px-6 py-3 text-slate-600">{l.unit}</td>
                <td className="px-6 py-3 text-right font-mono text-slate-600">
                  {l.ingredient.current_price_per_unit !== null
                    ? `£${l.ingredient.current_price_per_unit.toFixed(4)}`
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-900">
                  {l.line_value > 0 ? `£${l.line_value.toFixed(4)}` : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-slate-700">Total</td>
              <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                £{totalValue.toFixed(4)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  )
}
