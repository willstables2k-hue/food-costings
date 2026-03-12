import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { getConversionFactor } from '@/lib/unit-converter'

function calcTotalValue(
  lines: { counted_quantity: number; unit: string; ingredient: { current_price_per_unit: number | null; unit: string } }[]
): number {
  return lines.reduce((sum, line) => {
    if (line.ingredient.current_price_per_unit === null) return sum
    let factor = 1
    try { factor = getConversionFactor(line.unit, line.ingredient.unit) } catch { /* skip incompatible */ }
    return sum + line.counted_quantity * factor * line.ingredient.current_price_per_unit
  }, 0)
}

export default async function StockCountsPage() {
  const counts = await prisma.stockCount.findMany({
    orderBy: { counted_at: 'desc' },
    include: {
      lines: {
        include: { ingredient: { select: { current_price_per_unit: true, unit: true } } },
      },
      _count: { select: { lines: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Stock Counts"
        description="Record and track physical ingredient stocktakes"
        action={{ label: '+ New Count', href: '/stockcounts/new' }}
      />
      {counts.length === 0 ? (
        <EmptyState
          title="No stock counts yet"
          description="Record a physical stocktake to track ingredient quantities and stock value."
          action={{ label: '+ New Count', href: '/stockcounts/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Lines</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Total value</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => {
                const totalValue = calcTotalValue(c.lines)
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/stockcounts/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {c.name}
                      </Link>
                      {c.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.notes}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(c.counted_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{c._count.lines}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      £{totalValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={c.status === 'submitted' ? 'green' : 'gray'}>
                        {c.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
