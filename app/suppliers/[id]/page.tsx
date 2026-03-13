import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { DeleteButton } from '@/components/ui/DeleteButton'

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supplier = await prisma.supplier.findUnique({
    where: { id: parseInt(id) },
    include: {
      invoices: {
        orderBy: { invoice_date: 'desc' },
        take: 20,
        include: { _count: { select: { line_items: true } } },
      },
    },
  })
  if (!supplier) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/suppliers/${id}/edit`}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Edit
            </Link>
            <DeleteButton
              endpoint={`/api/suppliers/${id}`}
              redirectTo="/suppliers"
              label="Delete Supplier"
              confirmTitle="Delete this supplier?"
              confirmMessage="This will permanently delete the supplier and all their contact details. This cannot be undone."
              disabled={supplier.invoices.length > 0}
              disabledReason="This supplier has invoices and cannot be deleted. Delete or reassign all invoices for this supplier first."
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <dl className="space-y-3 text-sm">
            {supplier.contact && (
              <div>
                <dt className="text-slate-500">Contact</dt>
                <dd className="font-medium text-slate-900">{supplier.contact}</dd>
              </div>
            )}
            {supplier.email && (
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{supplier.email}</dd>
              </div>
            )}
            {supplier.phone && (
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{supplier.phone}</dd>
              </div>
            )}
            {!supplier.contact && !supplier.email && !supplier.phone && (
              <p className="text-slate-400">No contact details recorded.</p>
            )}
          </dl>
        </Card>
        {supplier.notes && (
          <Card>
            <p className="text-sm text-slate-500 mb-1">Notes</p>
            <p className="text-sm text-slate-700">{supplier.notes}</p>
          </Card>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Invoices
          </h2>
          <Link href="/invoices/new" className="text-sm text-blue-600 hover:underline">
            + New Invoice
          </Link>
        </div>
        {supplier.invoices.length === 0 ? (
          <p className="text-sm text-slate-400">No invoices yet for this supplier.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-semibold text-slate-600">Date</th>
                <th className="text-left py-2 font-semibold text-slate-600">Reference</th>
                <th className="text-right py-2 font-semibold text-slate-600">Line items</th>
              </tr>
            </thead>
            <tbody>
              {supplier.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                    </Link>
                  </td>
                  <td className="py-3 text-slate-600">{inv.reference ?? '—'}</td>
                  <td className="py-3 text-right text-slate-600">{inv._count.line_items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
