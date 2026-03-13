'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { ROLE_LABELS, ROLE_COLORS, type Role } from '@/lib/permissions'

const navGroups = [
  {
    items: [
      { href: '/dashboard',       label: 'Dashboard',       icon: '▦' },
      { href: '/products',        label: 'Products',        icon: '📦' },
      { href: '/recipes',         label: 'Recipes',         icon: '📋' },
      { href: '/ingredients',     label: 'Ingredients',     icon: '🧂' },
      { href: '/invoices',        label: 'Invoices',        icon: '🧾' },
      { href: '/suppliers',       label: 'Suppliers',       icon: '🏭' },
      { href: '/stockcounts',     label: 'Stock Counts',    icon: '🔢' },
      { href: '/waste',           label: 'Waste Log',       icon: '🗑️' },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: '🛒' },
      { href: '/sales',           label: 'Sales Data',      icon: '💷' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/reports/avt',               label: 'Actual vs Theoretical', icon: '📊' },
      { href: '/reports/menu-engineering',  label: 'Menu Engineering',      icon: '🎯' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user?.role ?? 'viewer') as Role

  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-slate-100 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Food Costings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Production Cost Tracker</p>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white font-medium'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Settings — owner only */}
        {role === 'owner' && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
              Settings
            </p>
            <div className="space-y-1">
              <Link
                href="/settings/users"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname.startsWith('/settings/users')
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>👥</span>
                <span>Users</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* User menu */}
      {session?.user && (
        <div className="p-3 border-t border-slate-700 space-y-2">
          <div className="px-1">
            <p className="text-sm font-medium text-slate-200 truncate">
              {session.user.name ?? session.user.email}
            </p>
            <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            <div className="mt-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span>→</span>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  )
}
