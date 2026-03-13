import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PurchaseOrderActions } from '@/components/purchase-orders/PurchaseOrderActions'

const STATUS_BADGE: Record<string, 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = {
  draft: 'gray',
  sent: 'blue',
  received: 'green',
  cancelled: 'red',
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      lines: {
        include: { ingredient: { select: { id: true, name: true, unit: true } } },
        orderBy: { id: 'asc' },
      },
    },
  })
  if (!order) notFound()

  const estimatedTotal = order.lines.reduce(
    (sum, l) => sum + (l.unit_price != null ? l.quantity * l.unit_price : 0),
    0
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={`PO-${order.id}`}
        description={order.notes ?? undefined}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-2">
            <Badge variant={STATUS_BADGE[order.status] ?? 'gray'}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Supplier</p>
          <p className="text-base font-semibold text-slate-900 mt-1">
            <Link href={`/suppliers/${order.supplier_id}`} className="hover:text-blue-600">
              {order.supplier.name}
            </Link>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Expected delivery</p>
          <p className="text-base font-semibold text-slate-900 mt-1">
            {order.expected_delivery
              ? new Date(order.expected_delivery).toLocaleDateString('en-GB')
              : <span className="text-slate-400">Not set</span>}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Estimated total</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">
            {estimatedTotal > 0 ? `£${estimatedTotal.toFixed(2)}` : <span className="text-slate-400">—</span>}
          </p>
        </Card>
      </div>

      {/* Actions */}
      {order.status !== 'cancelled' && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Actions</h2>
          <PurchaseOrderActions orderId={order.id} status={order.status} />
        </Card>
      )}
      {order.status === 'cancelled' && (
        <Card>
          <PurchaseOrderActions orderId={order.id} status={order.status} />
        </Card>
      )}

      {/* Lines table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Order Lines
            <span className="ml-2 text-sm font-normal text-slate-500">({order.lines.length})</span>
          </h2>
        </div>
        {order.lines.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">No lines on this order.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Ingredient</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Quantity</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Unit</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Unit price</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => {
                const lineTotal = l.unit_price != null ? l.quantity * l.unit_price : null
                return (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <Link href={`/ingredients/${l.ingredient_id}`} className="hover:text-blue-600">
                        {l.ingredient.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-700">{l.quantity}</td>
                    <td className="px-6 py-3 text-slate-600">{l.unit}</td>
                    <td className="px-6 py-3 text-right font-mono text-slate-600">
                      {l.unit_price != null
                        ? `£${l.unit_price.toFixed(4)}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-900">
                      {lineTotal != null
                        ? `£${lineTotal.toFixed(2)}`
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {estimatedTotal > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-6 py-3 text-sm font-semibold text-slate-700">Total</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">
                    £{estimatedTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </Card>

      <div className="text-xs text-slate-400">
        Created {new Date(order.created_at).toLocaleString('en-GB')}
        {' · '}Last updated {new Date(order.updated_at).toLocaleString('en-GB')}
      </div>
    </div>
  )
}
