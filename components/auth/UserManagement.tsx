'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ROLE_COLORS, ROLE_LABELS, type Role } from '@/lib/permissions'

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  is_active: boolean
  created_at: string
  sessions: { createdAt: string }[]
}

interface UserManagementProps {
  users: UserRow[]
  currentUserId: string
}

const ROLE_OPTIONS: Role[] = ['viewer', 'chef', 'manager', 'owner']

const inviteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
  role: z.enum(['viewer', 'chef', 'manager', 'owner']),
})
type InviteValues = z.infer<typeof inviteSchema>

const BADGE_VARIANT: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  owner:   'yellow',
  manager: 'blue',
  chef:    'green',
  viewer:  'gray',
}

export function UserManagement({ users: initialUsers, currentUserId }: UserManagementProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'chef' },
  })

  async function changeRole(userId: string, role: string) {
    setActionError(null)
    const res = await fetch(`/api/settings/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const err = await res.json()
      setActionError(err.error ?? 'Failed to update role')
      return
    }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
  }

  async function toggleActive(userId: string, is_active: boolean) {
    setActionError(null)
    const res = await fetch(`/api/settings/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    })
    if (!res.ok) {
      const err = await res.json()
      setActionError(err.error ?? 'Failed to update user')
      return
    }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active } : u))
  }

  async function onInvite(data: InviteValues) {
    const res = await fetch('/api/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setActionError(json.error ?? 'Failed to create user')
      return
    }
    setUsers((prev) => [...prev, { ...json, sessions: [] }])
    reset()
    setShowInvite(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* Users table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Users
            <span className="ml-2 text-sm font-normal text-slate-400">({users.length})</span>
          </h2>
          <Button size="sm" onClick={() => setShowInvite((v) => !v)}>
            {showInvite ? 'Cancel' : '+ Invite User'}
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-6 py-3 font-semibold text-slate-600">User</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Role</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Last sign-in</th>
              <th className="text-left px-6 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-right px-6 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const lastSession = user.sessions[0]
              const isSelf = user.id === currentUserId
              return (
                <tr key={user.id} className={`border-b border-slate-100 last:border-0 ${!user.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{user.name ?? '—'}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-3">
                    {isSelf ? (
                      <Badge variant={BADGE_VARIANT[user.role] ?? 'gray'}>
                        {ROLE_LABELS[user.role as Role] ?? user.role}
                      </Badge>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs">
                    {lastSession
                      ? new Date(lastSession.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={user.is_active ? 'green' : 'gray'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => toggleActive(user.id, !user.is_active)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                          user.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {isSelf && <span className="text-xs text-slate-300">You</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* Invite form */}
      {showInvite && (
        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Invite New User</h2>
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="name"
                label="Full name *"
                placeholder="Jane Smith"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                id="email"
                label="Email address *"
                type="email"
                placeholder="jane@restaurant.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                id="password"
                label="Temporary password *"
                type="password"
                placeholder="At least 6 characters"
                error={errors.password?.message}
                {...register('password')}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  {...register('role')}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3">
                The user will sign in with this email and temporary password. Ask them to note it — there is no email delivery.
              </p>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create Account'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowInvite(false); reset() }}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Role reference */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Role Permissions</h2>
        <div className="grid grid-cols-4 gap-3 text-sm">
          {(
            [
              { role: 'viewer' as Role, perms: 'Read-only: dashboard, products, recipes' },
              { role: 'chef' as Role,   perms: '+ Log waste, stock counts, sales data' },
              { role: 'manager' as Role,perms: '+ Ingredients, recipes, suppliers, invoices, purchase orders' },
              { role: 'owner' as Role,  perms: '+ User management, full access' },
            ] as const
          ).map(({ role, perms }) => (
            <div key={role} className={`rounded-lg px-3 py-2.5 ${ROLE_COLORS[role]}`}>
              <p className="font-semibold text-xs uppercase tracking-wide mb-1">{ROLE_LABELS[role]}</p>
              <p className="text-xs leading-relaxed opacity-80">{perms}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
