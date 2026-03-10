import { NextResponse } from "next/server"
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = "ok" | "warn" | "error"

interface ServiceCheck {
  name: string
  status: CheckStatus
  latencyMs: number
  message: string
}

interface SystemStatusData {
  timestamp: string
  services: ServiceCheck[]
  platform: {
    maintenanceMode: string
    zarinpalMode: string
    avalaiModel: string
  }
  stats: {
    activeOffices: number
    subscriptionBreakdown: { FREE: number; PRO: number; TEAM: number }
    stuckPayments: number
    lastAdminAction: { timestamp: string; action: string } | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Races a promise against a timeout. Rejects with a timeout error if the
 * promise doesn't settle within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ])
}

/**
 * Wraps a check function: measures wall-clock latency and converts any
 * unexpected throws into an "error" result so Promise.allSettled always
 * receives a fulfilled value.
 */
async function runCheck(
  name: string,
  fn: () => Promise<Omit<ServiceCheck, "latencyMs">>
): Promise<ServiceCheck> {
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

// ─── Individual Service Checks ────────────────────────────────────────────────

async function checkDb(): Promise<Omit<ServiceCheck, "latencyMs">> {
  await withTimeout(db.$queryRaw`SELECT 1`, 5000)
  return { name: "Database", status: "ok", message: "SELECT 1 succeeded" }
}

async function checkStorage(): Promise<Omit<ServiceCheck, "latencyMs">> {
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

  const sentinelKey = "health-sentinel.txt"

  try {
    await withTimeout(
      s3.send(new HeadObjectCommand({ Bucket: bucket, Key: sentinelKey })),
      5000
    )
    return { name: "IranServer Storage", status: "ok", message: "sentinel file exists" }
  } catch (err) {
    // S3 HeadObject 404 surfaces as a "NotFound" error name or HTTP 404 metadata.
    const httpStatus = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode
    const isNotFound =
      (err instanceof Error &&
        (err.name === "NotFound" || err.name === "NoSuchKey")) ||
      httpStatus === 404

    if (isNotFound) {
      // First-time setup: create the sentinel so future checks can use HEAD only.
      await withTimeout(
        s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: sentinelKey,
            Body: Buffer.from("health-sentinel", "utf-8"),
            ContentType: "text/plain",
          })
        ),
        5000
      )
      return {
        name: "IranServer Storage",
        status: "ok",
        message: "sentinel created, storage is writable",
      }
    }

    // Connection error, auth error, etc. — re-throw so runCheck marks it error.
    throw err
  }
}

async function checkAvalAI(): Promise<Omit<ServiceCheck, "latencyMs">> {
  const apiKey = process.env.AVALAI_API_KEY
  if (!apiKey) {
    return { name: "AvalAI", status: "error", message: "AVALAI_API_KEY is not set" }
  }

  const response = await fetch("https://api.avalai.ir/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
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

  return { name: "AvalAI", status: "ok", message: "reachable, response received" }
}

async function checkKaveNegar(): Promise<Omit<ServiceCheck, "latencyMs">> {
  const apiKey = process.env.KAVENEGAR_API_KEY
  if (!apiKey) {
    return { name: "KaveNegar", status: "error", message: "KAVENEGAR_API_KEY is not set" }
  }

  const response = await fetch(
    `https://api.kavenegar.com/v1/${apiKey}/account/info.json`,
    { signal: AbortSignal.timeout(5000) }
  )

  if (!response.ok) {
    return { name: "KaveNegar", status: "error", message: `HTTP ${response.status}` }
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
  return {
    name: "KaveNegar",
    status: "ok",
    message: credit !== undefined ? `API key valid, credit=${credit}` : "API key valid",
  }
}

async function checkNeshan(): Promise<Omit<ServiceCheck, "latencyMs">> {
  const apiKey = process.env.NESHAN_API_KEY
  if (!apiKey) {
    return { name: "Neshan", status: "error", message: "NESHAN_API_KEY is not set" }
  }

  // Known Tehran coordinate (Azadi Square / میدان آزادی)
  const response = await fetch(
    "https://api.neshan.org/v5/reverse?lat=35.6892&lng=51.389",
    {
      headers: { "Api-Key": apiKey },
      signal: AbortSignal.timeout(5000),
    }
  )

  if (!response.ok) {
    return { name: "Neshan", status: "error", message: `HTTP ${response.status}` }
  }

  const data = (await response.json()) as {
    status?: string
    formatted_address?: string
  }

  if (data.status === "ERROR" || typeof data.formatted_address !== "string") {
    return {
      name: "Neshan",
      status: "error",
      message: `unexpected response: ${JSON.stringify(data).slice(0, 120)}`,
    }
  }

  return { name: "Neshan", status: "ok", message: "reverse geocode OK" }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Run all service checks in parallel. runCheck never throws — allSettled is
  // used for safety in case that ever changes.
  const settled = await Promise.allSettled([
    runCheck("Database", checkDb),
    runCheck("IranServer Storage", checkStorage),
    runCheck("AvalAI", checkAvalAI),
    runCheck("KaveNegar", checkKaveNegar),
    runCheck("Neshan", checkNeshan),
  ])

  const serviceNames = ["Database", "IranServer Storage", "AvalAI", "KaveNegar", "Neshan"]
  const services: ServiceCheck[] = settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value
    return {
      name: serviceNames[i] ?? "Unknown",
      status: "error" as const,
      latencyMs: 0,
      message:
        result.reason instanceof Error ? result.reason.message : String(result.reason),
    }
  })

  // If the DB is unreachable we cannot fetch any stats — return 500.
  const dbCheck = services[0]
  if (dbCheck?.status === "error") {
    return NextResponse.json(
      { success: false, error: "Database unreachable — cannot retrieve system stats" },
      { status: 500 }
    )
  }

  // Fetch all DB stats and platform settings in a single parallel batch.
  const [
    activeOffices,
    freeCount,
    proCount,
    teamCount,
    stuckPayments,
    lastLog,
    maintenanceSetting,
    zarinpalSetting,
    avalaiSetting,
  ] = await Promise.all([
    db.office.count({ where: { deletedAt: null } }),
    db.subscription.count({ where: { plan: "FREE" } }),
    db.subscription.count({ where: { plan: "PRO" } }),
    db.subscription.count({ where: { plan: "TEAM" } }),
    db.paymentRecord.count({ where: { status: "PENDING" } }),
    db.adminActionLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, action: true },
    }),
    db.platformSetting.findUnique({ where: { key: "MAINTENANCE_MODE" } }),
    db.platformSetting.findUnique({ where: { key: "ZARINPAL_MODE" } }),
    db.platformSetting.findUnique({ where: { key: "AVALAI_MODEL" } }),
  ])

  const data: SystemStatusData = {
    timestamp: new Date().toISOString(),
    services,
    platform: {
      maintenanceMode: maintenanceSetting?.value ?? "false",
      zarinpalMode: zarinpalSetting?.value ?? "production",
      avalaiModel: avalaiSetting?.value ?? "gpt-4o-mini",
    },
    stats: {
      activeOffices,
      subscriptionBreakdown: { FREE: freeCount, PRO: proCount, TEAM: teamCount },
      stuckPayments,
      lastAdminAction: lastLog
        ? { timestamp: lastLog.createdAt.toISOString(), action: lastLog.action }
        : null,
    },
  }

  return NextResponse.json({ success: true, data })
}
