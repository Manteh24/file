/**
 * Pre-deploy migration safety check.
 *
 * Usage: npm run migrate:check
 *
 * Runs `prisma migrate status` and checks for unapplied migrations.
 * This should be the first step in any deploy script — if it exits 1, do not start the server.
 *
 * Exit codes:
 *   0 — all migrations applied, safe to deploy
 *   1 — unapplied migrations found (or DB unreachable / command failed)
 */

import { exec } from "child_process"
import { promisify } from "util"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const execAsync = promisify(exec)

/**
 * Extracts migration names from `prisma migrate status` output.
 * Migration names follow the pattern: 14-digit timestamp + underscore + name.
 * e.g. "20260310000000_add_password_reset"
 */
function extractMigrationNames(text: string): string[] {
  const names: string[] = []
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (/^\d{14}_[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
      names.push(trimmed)
    }
  }
  return names
}

async function main(): Promise<void> {
  console.log("Checking database migration status...")
  console.log()

  let stdout = ""
  let stderr = ""
  let exitCode = 0

  try {
    const result = await execAsync("npx prisma migrate status", {
      env: { ...process.env },
    })
    stdout = result.stdout
    stderr = result.stderr
  } catch (err: unknown) {
    // execAsync rejects when the subprocess exits with a non-zero code.
    // The stdout/stderr are still available on the error object.
    const execError = err as { stdout?: string; stderr?: string; code?: number }
    stdout = execError.stdout ?? ""
    stderr = execError.stderr ?? ""
    exitCode = typeof execError.code === "number" ? execError.code : 1
  }

  // Print raw Prisma output so the operator can see full context.
  if (stdout) process.stdout.write(stdout)
  if (stderr) process.stderr.write(stderr)

  if (exitCode === 0) {
    console.log()
    console.log("✅ Database schema is up to date")
    process.exit(0)
  }

  // Non-zero exit: either unapplied migrations or DB is unreachable.
  // Try to extract migration names for a more actionable error message.
  const combined = stdout + "\n" + stderr
  const unapplied = extractMigrationNames(combined)

  console.log()

  if (unapplied.length > 0) {
    console.error("Unapplied migrations:")
    for (const name of unapplied) {
      console.error(`  • ${name}`)
    }
    console.error()
  }

  console.error("⚠️  Run npx prisma migrate deploy before starting the server")
  process.exit(1)
}

main().catch((err: unknown) => {
  console.error("Fatal:", err)
  process.exit(1)
})
