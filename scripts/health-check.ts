/**
 * External dependency health check script.
 *
 * Usage:
 *   npm run health
 *
 * Tests every external system the app depends on and reports
 * reachability / correctness. Never throws — all errors are caught per-check.
 *
 * Exit codes:
 *   0 — all checks ok (or only warnings)
 *   1 — at least one check errored
 */

import dotenv from "dotenv"
import path from "path"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import type { Readable } from "stream"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

// ─── ANSI ──────────────────────────────────────────────────────────────────────

const C = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = "ok" | "warn" | "error"

interface CheckResult {
  name: string
  status: CheckStatus
  latencyMs: number
  message: string
}

interface Output {
  status: "ok" | "warn" | "error"
  timestamp: string
  checks: CheckResult[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function colorFor(status: CheckStatus): string {
  if (status === "ok") return C.green
  if (status === "warn") return C.yellow
  return C.red
}

function iconFor(status: CheckStatus): string {
  if (status === "ok") return "✓"
  if (status === "warn") return "⚠"
  return "✗"
}

/** Drain a Node.js Readable stream to a string. */
async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
    stream.on("error", reject)
  })
}

/**
 * Wraps a check function: measures wall-clock latency and catches any
 * unexpected throws, converting them into an "error" result.
 */
async function runCheck(
  name: string,
  fn: () => Promise<Omit<CheckResult, "latencyMs">>
): Promise<CheckResult> {
  const start = Date.now()
  try {
    const result = await fn()
    return { ...result, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      name,
      status: "error",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Individual checks ─────────────────────────────────────────────────────────

async function checkPostgres(
  db: PrismaClient
): Promise<Omit<CheckResult, "latencyMs">> {
  try {
    await db.$queryRaw`SELECT 1`
    return { name: "PostgreSQL", status: "ok", message: "SELECT 1 succeeded" }
  } catch (err) {
    return {
      name: "PostgreSQL",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkStorage(): Promise<Omit<CheckResult, "latencyMs">> {
  const endpoint = process.env.STORAGE_ENDPOINT
  const accessKey = process.env.STORAGE_ACCESS_KEY
  const secretKey = process.env.STORAGE_SECRET_KEY
  const bucket = process.env.STORAGE_BUCKET_NAME

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return {
      name: "IranServer Storage",
      status: "error",
      message: "one or more STORAGE_* env vars are missing",
    }
  }

  const s3 = new S3Client({
    endpoint,
    region: "us-east-1", // dummy — required by SDK but ignored by S3-compatible providers
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  })

  const key = "health-check-probe.txt"
  const content = "health-check-probe"
  const steps: string[] = []

  try {
    // Step 1: Upload
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(content, "utf-8"),
        ContentType: "text/plain",
      })
    )
    steps.push("upload:ok")

    // Step 2: Read back and verify content
    const getRes = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    )
    if (!getRes.Body) {
      steps.push("read:empty-body")
      return {
        name: "IranServer Storage",
        status: "error",
        message: steps.join(", "),
      }
    }
    const readContent = await streamToString(getRes.Body as Readable)
    if (readContent !== content) {
      steps.push(`read:content-mismatch ("${readContent.slice(0, 40)}")`)
      return {
        name: "IranServer Storage",
        status: "error",
        message: steps.join(", "),
      }
    }
    steps.push("read:ok")

    // Step 3: Delete
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    steps.push("delete:ok")

    return {
      name: "IranServer Storage",
      status: "ok",
      message: steps.join(", "),
    }
  } catch (err) {
    steps.push(`error: ${err instanceof Error ? err.message : String(err)}`)
    return {
      name: "IranServer Storage",
      status: "error",
      message: steps.join(", "),
    }
  }
}

async function checkAvalAI(): Promise<Omit<CheckResult, "latencyMs">> {
  const apiKey = process.env.AVALAI_API_KEY
  const model = process.env.AVALAI_MODEL ?? "gpt-4o-mini"

  if (!apiKey) {
    return {
      name: "AvalAI",
      status: "error",
      message: "AVALAI_API_KEY is not set",
    }
  }

  try {
    const response = await fetch("https://api.avalai.ir/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)")
      return {
        name: "AvalAI",
        status: "error",
        message: `HTTP ${response.status}: ${text.slice(0, 120)}`,
      }
    }

    const data = (await response.json()) as { choices?: unknown[] }
    if (!Array.isArray(data.choices) || data.choices.length === 0) {
      return {
        name: "AvalAI",
        status: "error",
        message: "HTTP 200 but response contained no choices",
      }
    }

    return {
      name: "AvalAI",
      status: "ok",
      message: `HTTP 200, model=${model}`,
    }
  } catch (err) {
    return {
      name: "AvalAI",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkKaveNegar(): Promise<Omit<CheckResult, "latencyMs">> {
  const apiKey = process.env.KAVENEGAR_API_KEY

  if (!apiKey) {
    return {
      name: "KaveNegar",
      status: "error",
      message: "KAVENEGAR_API_KEY is not set",
    }
  }

  try {
    const url = `https://api.kavenegar.com/v1/${apiKey}/account/info.json`
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

    if (!response.ok) {
      return {
        name: "KaveNegar",
        status: "error",
        message: `HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as {
      return?: { status?: number; message?: string }
      entries?: { remaincredit?: number }
    }

    if (data.return?.status !== 200) {
      return {
        name: "KaveNegar",
        status: "error",
        message: `API status ${data.return?.status}: ${data.return?.message ?? "(no message)"}`,
      }
    }

    const credit = data.entries?.remaincredit
    const creditNote = credit !== undefined ? `, credit=${credit}` : ""
    return {
      name: "KaveNegar",
      status: "ok",
      message: `API key valid${creditNote}`,
    }
  } catch (err) {
    return {
      name: "KaveNegar",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkNeshan(): Promise<Omit<CheckResult, "latencyMs">> {
  const apiKey = process.env.NESHAN_API_KEY

  if (!apiKey) {
    return {
      name: "Neshan",
      status: "error",
      message: "NESHAN_API_KEY is not set",
    }
  }

  // Known Tehran coordinate (Azadi Square / میدان آزادی)
  const lat = 35.6892
  const lng = 51.389

  try {
    const response = await fetch(
      `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
      {
        headers: { "Api-Key": apiKey },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      return {
        name: "Neshan",
        status: "error",
        message: `HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as {
      status?: string
      formatted_address?: string
    }

    if (
      data.status === "ERROR" ||
      typeof data.formatted_address !== "string"
    ) {
      return {
        name: "Neshan",
        status: "error",
        message: `unexpected response: ${JSON.stringify(data).slice(0, 120)}`,
      }
    }

    return {
      name: "Neshan",
      status: "ok",
      message: `reverse geocode OK — "${data.formatted_address.slice(0, 80)}"`,
    }
  } catch (err) {
    return {
      name: "Neshan",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkZarinpal(
  db: PrismaClient
): Promise<Omit<CheckResult, "latencyMs">> {
  try {
    const setting = await db.platformSetting.findUnique({
      where: { key: "ZARINPAL_MODE" },
    })

    const mode = setting?.value ?? null

    if (mode === null) {
      return {
        name: "Zarinpal",
        status: "ok",
        message: "ZARINPAL_MODE not set in DB — defaults to production",
      }
    }

    if (mode === "sandbox") {
      return {
        name: "Zarinpal",
        status: "warn",
        message:
          "ZARINPAL_MODE=sandbox — payments are NOT real. Switch to 'production' before going live.",
      }
    }

    return {
      name: "Zarinpal",
      status: "ok",
      message: `ZARINPAL_MODE=${mode}`,
    }
  } catch (err) {
    return {
      name: "Zarinpal",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const db = new PrismaClient({ adapter })

  try {
    // All checks run in parallel to minimise total wall time.
    const checks = await Promise.all([
      runCheck("PostgreSQL", () => checkPostgres(db)),
      runCheck("IranServer Storage", checkStorage),
      runCheck("AvalAI", checkAvalAI),
      runCheck("KaveNegar", checkKaveNegar),
      runCheck("Neshan", checkNeshan),
      runCheck("Zarinpal", () => checkZarinpal(db)),
    ])

    const hasError = checks.some((c) => c.status === "error")
    const hasWarn = checks.some((c) => c.status === "warn")
    const overallStatus: "ok" | "warn" | "error" = hasError
      ? "error"
      : hasWarn
        ? "warn"
        : "ok"

    const output: Output = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    }

    // ── JSON output ──
    console.log(JSON.stringify(output, null, 2))
    console.log()

    // ── Color-coded console summary ──
    const statusColor = colorFor(overallStatus)
    console.log(
      `${C.bold}=== Health Check — ${output.timestamp} ===${C.reset}`
    )
    console.log()
    for (const check of checks) {
      const color = colorFor(check.status)
      const icon = iconFor(check.status)
      console.log(
        `  ${color}${icon}${C.reset} ${C.bold}${check.name}${C.reset} [${check.latencyMs}ms]`
      )
      console.log(`     ${check.message}`)
    }
    console.log()
    console.log(
      `${statusColor}${C.bold}Overall: ${overallStatus.toUpperCase()}${C.reset}`
    )

    if (hasError) process.exit(1)
    // warnings: exit 0 — the warning text above is sufficient
  } finally {
    await db.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err)
  process.exit(1)
})
