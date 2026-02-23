/**
 * Seed script — creates the first SUPER_ADMIN user.
 *
 * Usage:
 *   npm run seed:admin
 *
 * Required env vars (in .env.local):
 *   ADMIN_USERNAME  — login username for the super admin account
 *   ADMIN_PASSWORD  — plain-text password (will be bcrypt-hashed before storage)
 *
 * Idempotent — exits early if a SUPER_ADMIN already exists.
 */

import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    console.error(
      "❌  ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env.local"
    )
    process.exit(1)
  }

  // Idempotency check — skip if any SUPER_ADMIN already exists
  const existing = await db.user.findFirst({ where: { role: "SUPER_ADMIN" } })
  if (existing) {
    console.log(`ℹ️  SUPER_ADMIN already exists: ${existing.username} — skipping.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await db.user.create({
    data: {
      username,
      displayName: "Super Admin",
      passwordHash,
      role: "SUPER_ADMIN",
      officeId: null, // admin users are not tied to any tenant office
    },
  })

  console.log(`✅  SUPER_ADMIN created: ${admin.username} (id: ${admin.id})`)
}

main()
  .catch((err) => {
    console.error("❌  Seed failed:", err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
