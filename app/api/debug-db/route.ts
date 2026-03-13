export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL ?? 'NOT SET'
    const token = process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET'

    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()

    return NextResponse.json({ url_prefix: url.slice(0, 30), token, user_count: count })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
