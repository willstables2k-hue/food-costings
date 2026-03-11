import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: {
      supplier: true,
      line_items: {
        include: { ingredient: true },
        orderBy: { id: 'asc' },
      },
      price_history: {
        include: { ingredient: true },
      },
    },
  })
  if (!invoice) notFound()

  const snapshots = await prisma.costSnapshot.findMany({
    where: { triggered_by_invoice_id: parseInt(id) },
    include: { product: true },
    orderBy: { snapshotted_at: 'desc' },
  })

  const totalCost = invoice.line_items.reduce((sum, li) => sum + li.total_cost, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.reference ?? `Invoice #${invoice.id}`}
        description={`${invoice.supplier.name} · ${new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Supplier</p>
          <Link href={`/suppliers/${invoice.supplier_id}`} className="font-medium text-slate-900 hover:text-blue-600 mt-1 block">
            {invoice.supplier.name}
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Invoice date</p>
          <p className="font-medium text-slate-900 mt-1">
            {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total spend</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">£{totalCost.toFixed(2)}</p>
        </Card>
      </div>

      {invoice.notes && (
        <Card>
          <p className="text-sm text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{invoice.notes}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Line Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 font-semibold text-slate-600">Ingredient</th>
              <th className="text-right py-2 font-semibold text-slate-600">Quantity</th>
              <th className="text-left py-2 pl-2 font-semibold text-slate-600">Unit</th>
              <th className="text-right py-2 font-semibold text-slate-600">Total cost</th>
              <th className="text-right py-2 font-semibold text-slate-600">Price per canonical unit</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((li) => (
              <tr key={li.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3">
                  <Link href={`/ingredients/${li.ingredient_id}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {li.ingredient.name}
                  </Link>
                </td>
                <td className="py-3 text-right text-slate-600">{li.quantity}</td>
                <td className="py-3 pl-2 text-slate-600">{li.purchase_unit}</td>
                <td className="py-3 text-right font-mono text-slate-900">£{li.total_cost.toFixed(2)}</td>
                <td className="py-3 text-right font-mono text-slate-600">
                  {li.price_per_canonical_unit !== null
                    ? `£${li.price_per_canonical_unit.toFixed(4)} / ${li.ingredient.unit}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {snapshots.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Cost Snapshots Created
            <span className="ml-2 text-sm font-normal text-slate-500">
              {snapshots.length} {snapshots.length === 1 ? 'product' : 'products'} updated
            </span>
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600">Product</th>
                <th className="text-right py-2 font-semibold text-slate-600">Recorded cost</th>
                <th className="text-right py-2 font-semibold text-slate-600">Snapshotted at</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">
                    <Link href={`/products/${s.product_id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {s.product.name}
                    </Link>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-900">£{s.total_cost.toFixed(4)}</td>
                  <td className="py-3 text-right text-slate-600">
                    {new Date(s.snapshotted_at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
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
