import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MarginBadge } from '@/components/cost/MarginBadge'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      recipe: true,
      cost_snapshots: {
        orderBy: { snapshotted_at: 'desc' },
        take: 1,
      },
    },
  })

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage sellable products and their pricing"
        action={{ label: '+ New Product', href: '/products/new' }}
      />
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create a product by linking a recipe with wholesale and retail prices."
          action={{ label: '+ New Product', href: '/products/new' }}
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Product</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Last cost</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Wholesale</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Retail</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const lastSnapshot = p.cost_snapshots[0]
                const wholesaleMargin = lastSnapshot && p.wholesale_price
                  ? ((p.wholesale_price - lastSnapshot.total_cost) / p.wholesale_price) * 100
                  : null
                const retailMargin = lastSnapshot && p.retail_price
                  ? ((p.retail_price - lastSnapshot.total_cost) / p.retail_price) * 100
                  : null
                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/products/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">{p.recipe.name}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      {lastSnapshot ? `£${lastSnapshot.total_cost.toFixed(4)}` : '—'}
                      {p.selling_unit && <span className="text-slate-400 text-xs ml-1">{p.selling_unit}</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-slate-900">
                        {p.wholesale_price !== null ? `£${p.wholesale_price.toFixed(2)}` : '—'}
                      </div>
                      <MarginBadge margin={wholesaleMargin} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-slate-900">
                        {p.retail_price !== null ? `£${p.retail_price.toFixed(2)}` : '—'}
                      </div>
                      <MarginBadge margin={retailMargin} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={p.is_active ? 'green' : 'gray'}>
                        {p.is_active ? 'Active' : 'Inactive'}
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
