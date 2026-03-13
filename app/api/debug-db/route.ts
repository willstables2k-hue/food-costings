export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL ?? 'NOT_SET'
  const authToken = process.env.TURSO_AUTH_TOKEN
  const dbUrl = process.env.DATABASE_URL ?? 'NOT_SET'

  // Test 1: direct @libsql/client
  let libsqlResult: string
  try {
    const { createClient } = await import('@libsql/client')
    const db = createClient({ url, authToken })
    const r = await db.execute('SELECT COUNT(*) as n FROM users')
    libsqlResult = `OK: ${r.rows[0].n} users`
    db.close()
  } catch (e: unknown) {
    libsqlResult = `ERROR: ${String(e).slice(0, 200)}`
  }

  // Test 2: Prisma
  let prismaResult: string
  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    prismaResult = `OK: ${count} users`
  } catch (e: unknown) {
    prismaResult = `ERROR: ${String(e).slice(0, 200)}`
  }

  return NextResponse.json({
    url_prefix: url.slice(0, 40),
    token: authToken ? 'SET' : 'NOT_SET',
    db_url: dbUrl.slice(0, 20),
    libsql: libsqlResult,
    prisma: prismaResult,
  })
}
