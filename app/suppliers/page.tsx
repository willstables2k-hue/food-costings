import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { invoices: true } } },
  })

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your ingredient suppliers"
        action={{ label: '+ New Supplier', href: '/suppliers/new' }}
      />
      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add your first supplier to start entering invoices."
          action={{ label: '+ New Supplier', href: '/suppliers/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Contact</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link href={`/suppliers/${s.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.contact ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{s.email ?? '—'}</td>
                  <td className="px-6 py-4 text-right text-slate-600">{s._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
