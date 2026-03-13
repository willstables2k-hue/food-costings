import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  // Turso (production) — TURSO_DATABASE_URL takes precedence over local SQLite
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL!
  const authToken = process.env.TURSO_AUTH_TOKEN // undefined for local file URLs

  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
