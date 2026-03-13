import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = {
  draft: 'gray',
  sent: 'blue',
  received: 'green',
  cancelled: 'red',
}

export default async function PurchaseOrdersPage() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: { select: { quantity: true, unit_price: true } },
    },
  })

  const result = orders.map((o) => ({
    ...o,
    line_count: o.lines.length,
    estimated_total: o.lines.reduce(
      (sum, l) => sum + (l.unit_price != null ? l.quantity * l.unit_price : 0),
      0
    ),
  }))

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Create and track orders to suppliers"
        action={{ label: '+ New Order', href: '/purchase-orders/new' }}
      />

      {result.length === 0 ? (
        <EmptyState
          title="No purchase orders yet"
          description="Create a purchase order to track stock replenishment from suppliers."
          action={{ label: '+ New Order', href: '/purchase-orders/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Order</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Supplier</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Expected delivery</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Lines</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Est. total</th>
              </tr>
            </thead>
            <tbody>
              {result.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/purchase-orders/${o.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      PO-{o.id}
                    </Link>
                    {o.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{o.notes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{o.supplier.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_BADGE[o.status] ?? 'gray'}>
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {o.expected_delivery
                      ? new Date(o.expected_delivery).toLocaleDateString('en-GB')
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">{o.line_count}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-900">
                    {o.estimated_total > 0 ? `£${o.estimated_total.toFixed(2)}` : <span className="text-slate-300">—</span>}
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
