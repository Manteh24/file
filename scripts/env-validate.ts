/**
 * Environment variable validation script.
 *
 * Usage:
 *   npm run env:validate
 *
 * Reads all keys from .env.example, checks each is present and non-empty in
 * the current process environment, and applies shape validation to specific
 * keys. Exits with code 1 if any check fails so it can block a deploy pipeline.
 */

import dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

// Load .env.local first (higher priority), then .env as fallback.
// dotenv never overwrites already-set values, so order matters.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

// ─── ANSI ──────────────────────────────────────────────────────────────────────

const GREEN = "\x1b[32m"
const RED = "\x1b[31m"
const BOLD = "\x1b[1m"
const RESET = "\x1b[0m"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CheckResult {
  key: string
  status: "ok" | "error"
  message: string
}

interface Output {
  status: "ok" | "error"
  checks: CheckResult[]
}

// ─── Parse .env.example ────────────────────────────────────────────────────────

function readEnvExampleKeys(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8")
  const keys: string[] = []
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx > 0) {
      keys.push(trimmed.slice(0, eqIdx).trim())
    }
  }
  return keys
}

// ─── Checks ────────────────────────────────────────────────────────────────────

function checkPresence(key: string): CheckResult {
  const value = process.env[key]
  if (value === undefined || value === "") {
    return { key, status: "error", message: "missing or empty" }
  }
  return { key, status: "ok", message: "present" }
}

/**
 * Returns a shape-validation result for keys that have specific format
 * requirements. Returns null for keys with no additional shape constraint.
 */
function checkShape(key: string, value: string): CheckResult | null {
  switch (key) {
    case "DATABASE_URL":
      if (!value.startsWith("postgresql://")) {
        return {
          key,
          status: "error",
          message: 'must start with "postgresql://"',
        }
      }
      return { key, status: "ok", message: 'starts with "postgresql://"' }

    case "ZARINPAL_MERCHANT_ID": {
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRe.test(value)) {
        return {
          key,
          status: "error",
          message:
            "must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)",
        }
      }
      return { key, status: "ok", message: "valid UUID format" }
    }

    case "NEXTAUTH_SECRET":
      if (value.length < 32) {
        return {
          key,
          status: "error",
          message: `must be at least 32 characters (got ${value.length})`,
        }
      }
      return { key, status: "ok", message: `${value.length} characters` }

    case "NEXT_PUBLIC_SHARE_DOMAIN":
      if (!value.startsWith("https://")) {
        return {
          key,
          status: "error",
          message: 'must start with "https://"',
        }
      }
      return { key, status: "ok", message: 'starts with "https://"' }

    case "STORAGE_BUCKET_NAME":
      // Presence is already checked; re-assert non-empty as a shape rule.
      if (!value) {
        return { key, status: "error", message: "must be a non-empty string" }
      }
      return { key, status: "ok", message: "non-empty string" }

    default:
      return null
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const envExamplePath = path.resolve(process.cwd(), ".env.example")

  if (!fs.existsSync(envExamplePath)) {
    console.error(`${RED}✗${RESET} .env.example not found at ${envExamplePath}`)
    process.exit(1)
  }

  const keys = readEnvExampleKeys(envExamplePath)
  const checks: CheckResult[] = []

  for (const key of keys) {
    const presence = checkPresence(key)
    if (presence.status === "error") {
      checks.push(presence)
      continue
    }
    // Value is present — run shape validation if applicable
    const shape = checkShape(key, process.env[key]!)
    checks.push(shape ?? presence)
  }

  const hasError = checks.some((c) => c.status === "error")
  const output: Output = { status: hasError ? "error" : "ok", checks }

  // ── JSON output ──
  console.log(JSON.stringify(output, null, 2))
  console.log()

  // ── Human-readable summary ──
  console.log(`${BOLD}=== Environment Validation ===${RESET}`)
  console.log()
  for (const check of checks) {
    const icon = check.status === "ok" ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
    console.log(`  ${icon} ${BOLD}${check.key}${RESET}: ${check.message}`)
  }
  console.log()

  const okCount = checks.filter((c) => c.status === "ok").length
  const errorCount = checks.filter((c) => c.status === "error").length

  if (hasError) {
    console.log(
      `${RED}${BOLD}FAILED${RESET}: ${errorCount} error(s), ${okCount} passed`
    )
    process.exit(1)
  } else {
    console.log(`${GREEN}${BOLD}PASSED${RESET}: all ${okCount} checks passed`)
  }
}

main()
