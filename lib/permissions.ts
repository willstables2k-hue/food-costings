export type Role = 'viewer' | 'chef' | 'manager' | 'owner'

export const ROLE_LEVEL: Record<Role, number> = {
  viewer: 0,
  chef: 1,
  manager: 2,
  owner: 3,
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Viewer',
  chef: 'Chef',
  manager: 'Manager',
  owner: 'Owner',
}

export const ROLE_COLORS: Record<Role, string> = {
  viewer: 'bg-slate-100 text-slate-600',
  chef: 'bg-green-100 text-green-700',
  manager: 'bg-blue-100 text-blue-700',
  owner: 'bg-purple-100 text-purple-700',
}

export function hasRole(userRole: string | undefined | null, required: Role): boolean {
  if (!userRole) return false
  return (ROLE_LEVEL[userRole as Role] ?? -1) >= ROLE_LEVEL[required]
}
