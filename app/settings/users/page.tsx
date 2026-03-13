import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserManagement } from '@/components/auth/UserManagement'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'owner') notFound()

  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const serialised = users.map((u) => ({
    ...u,
    created_at: u.created_at.toISOString(),
    sessions: u.sessions.map((s) => ({ createdAt: s.createdAt.toISOString() })),
  }))

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage team access and roles"
      />
      <UserManagement users={serialised} currentUserId={session.user.id} />
    </div>
  )
}
