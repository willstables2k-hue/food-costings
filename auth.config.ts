import type { NextAuthConfig } from 'next-auth'

// Routes that require a minimum role level (checked in middleware)
const OWNER_ROUTES = ['/settings']

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // Always allow auth API, login page, and debug endpoints
      if (pathname.startsWith('/api/auth')) return true
      if (pathname === '/login') {
        // Redirect logged-in users away from login
        if (isLoggedIn) return Response.redirect(new URL('/dashboard', nextUrl))
        return true
      }

      // All other routes require authentication
      if (!isLoggedIn) return false

      const role = auth.user.role ?? 'viewer'

      // Owner-only routes
      if (OWNER_ROUTES.some((r) => pathname.startsWith(r))) {
        if (role !== 'owner') return Response.redirect(new URL('/dashboard', nextUrl))
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role ?? 'viewer'
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  providers: [], // populated in auth.ts
}
