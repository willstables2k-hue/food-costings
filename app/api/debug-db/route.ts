export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL ?? 'NOT_SET'
  const token = process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT_SET'
  const dbUrl = process.env.DATABASE_URL ?? 'NOT_SET'

  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    return NextResponse.json({ url_prefix: url.slice(0, 40), token, db_url: dbUrl.slice(0, 20), user_count: count })
  } catch (e: unknown) {
    return NextResponse.json({ url_prefix: url.slice(0, 40), token, db_url: dbUrl.slice(0, 20), error: String(e) }, { status: 500 })
  }
}
