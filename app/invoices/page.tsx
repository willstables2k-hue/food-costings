import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoice_date: 'desc' },
    include: {
      supplier: true,
      _count: { select: { line_items: true } },
    },
  })

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Record supplier invoices to update ingredient pricing"
        action={{ label: '+ New Invoice', href: '/invoices/new' }}
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Enter an invoice to start tracking ingredient prices and cost history."
          action={{ label: '+ New Invoice', href: '/invoices/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Supplier</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Reference</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Line items</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <Link href={`/suppliers/${inv.supplier_id}`} className="hover:text-blue-600">
                      {inv.supplier.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{inv.reference ?? '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{inv._count.line_items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
