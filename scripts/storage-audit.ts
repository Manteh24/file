/**
 * Storage audit script.
 *
 * Usage:
 *   npm run storage:audit
 *
 * Lists every object in the IranServer S3 bucket, queries all image URLs stored
 * in the database (FilePhoto, User.avatarUrl, TicketMessage.attachmentUrl), and
 * cross-references the two sets to surface:
 *
 *   - Orphaned objects: exist in storage but no DB record points to them.
 *     Objects younger than 24 h are flagged separately (may be in-flight uploads).
 *
 *   - Broken references: a DB record contains a URL whose storage key does not
 *     exist in the bucket.
 *
 * Writes a timestamped JSON report to scripts/reports/.
 * Exits 1 if there are any broken references OR orphaned objects older than 24 h.
 */

import dotenv from "dotenv"
import path from "path"
import fs from "fs"
import {
  S3Client,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3"

// Load env before any module that reads process.env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

// ─── ANSI ──────────────────────────────────────────────────────────────────────

const C = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface S3Obj {
  key: string
  sizeMb: number
  lastModified: Date
}

interface OrphanedObject {
  key: string
  sizeMb: number
  lastModified: string
  /** True when the object is older than 24 h — likely not a fresh upload. */
  olderThan24h: boolean
}

interface BrokenRef {
  /** ID of the DB record that owns the broken URL. */
  fileId: string
  /** Model + field path, e.g. "FilePhoto.url" */
  fieldName: string
  url: string
}

interface StorageAuditOutput {
  timestamp: string
  summary: {
    totalObjects: number
    totalSizeMb: number
    orphanedCount: number
    /** Orphaned objects younger than 24 h (likely in-flight — soft warning). */
    orphanedFreshCount: number
    brokenRefCount: number
  }
  orphaned: OrphanedObject[]
  brokenRefs: BrokenRef[]
}

// ─── S3 helpers ────────────────────────────────────────────────────────────────

/** Paginates through the entire bucket and returns every object. */
async function listAllObjects(s3: S3Client, bucket: string): Promise<S3Obj[]> {
  const objects: S3Obj[] = []
  let token: string | undefined

  do {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    )

    for (const obj of res.Contents ?? []) {
      if (
        obj.Key !== undefined &&
        obj.Size !== undefined &&
        obj.LastModified !== undefined
      ) {
        objects.push({
          key: obj.Key,
          sizeMb: obj.Size / (1024 * 1024),
          lastModified: obj.LastModified,
        })
      }
    }

    token = res.IsTruncated === true ? res.NextContinuationToken : undefined
  } while (token !== undefined)

  return objects
}

// ─── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Extracts the storage key from a full public URL.
 * Returns null when the URL does not belong to the configured bucket
 * (external URL, misconfigured endpoint, etc.).
 */
function urlToKey(url: string, urlPrefix: string): string | null {
  if (url.startsWith(urlPrefix)) return url.slice(urlPrefix.length)
  return null
}

// ─── Console output ────────────────────────────────────────────────────────────

function printSummary(output: StorageAuditOutput, reportPath: string): void {
  const { summary, orphaned, brokenRefs } = output

  console.log(`${C.bold}=== Storage Audit — ${output.timestamp} ===${C.reset}`)
  console.log(`${C.cyan}Report: ${reportPath}${C.reset}`)
  console.log()

  console.log(`  Total objects      ${summary.totalObjects}`)
  console.log(`  Total size         ${summary.totalSizeMb.toFixed(2)} MB`)

  const orphanColor = summary.orphanedCount > 0 ? C.yellow : C.green
  console.log(
    `  Orphaned objects   ${orphanColor}${summary.orphanedCount}${C.reset}` +
      (summary.orphanedFreshCount > 0
        ? ` ${C.dim}(${summary.orphanedFreshCount} fresh <24 h)${C.reset}`
        : "")
  )

  const brokenColor = summary.brokenRefCount > 0 ? C.red : C.green
  console.log(
    `  Broken DB refs     ${brokenColor}${summary.brokenRefCount}${C.reset}`
  )

  if (orphaned.length > 0) {
    console.log()
    console.log(`${C.yellow}${C.bold}Orphaned objects (first 10):${C.reset}`)
    for (const obj of orphaned.slice(0, 10)) {
      const age = obj.olderThan24h
        ? `${C.yellow}[>24 h]${C.reset}`
        : `${C.dim}[<24 h]${C.reset}`
      console.log(
        `  ${age} ${obj.key}  ${C.dim}${obj.sizeMb.toFixed(3)} MB  ${obj.lastModified}${C.reset}`
      )
    }
    if (orphaned.length > 10) {
      console.log(`  ${C.dim}… and ${orphaned.length - 10} more${C.reset}`)
    }
  }

  if (brokenRefs.length > 0) {
    console.log()
    console.log(`${C.red}${C.bold}Broken references (first 10):${C.reset}`)
    for (const ref of brokenRefs.slice(0, 10)) {
      console.log(`  ${C.bold}${ref.fieldName}${C.reset}  id=${ref.fileId}`)
      console.log(`    ${C.dim}${ref.url}${C.reset}`)
    }
    if (brokenRefs.length > 10) {
      console.log(`  ${C.dim}… and ${brokenRefs.length - 10} more${C.reset}`)
    }
  }

  console.log()

  const staleOrphans = orphaned.filter((o) => o.olderThan24h).length
  const hasErrors = summary.brokenRefCount > 0 || staleOrphans > 0

  if (hasErrors) {
    console.log(`${C.red}${C.bold}ISSUES FOUND — exit 1${C.reset}`)
  } else if (summary.orphanedCount > 0) {
    console.log(
      `${C.yellow}${C.bold}WARNINGS: fresh orphans present (may be in-flight uploads)${C.reset}`
    )
  } else {
    console.log(`${C.green}${C.bold}CLEAN${C.reset}`)
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const endpoint = process.env.STORAGE_ENDPOINT
  const accessKey = process.env.STORAGE_ACCESS_KEY
  const secretKey = process.env.STORAGE_SECRET_KEY
  const bucket = process.env.STORAGE_BUCKET_NAME

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    console.error(
      `${C.red}✗${C.reset} STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, and STORAGE_BUCKET_NAME must all be set`
    )
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error(`${C.red}✗${C.reset} DATABASE_URL is not set`)
    process.exit(1)
  }

  // Dynamic import AFTER dotenv — lib/db.ts reads DATABASE_URL at module eval time
  const { db } = await import("../lib/db")

  const s3 = new S3Client({
    endpoint,
    region: "us-east-1", // dummy — required by SDK, ignored by S3-compatible providers
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  })

  // URL prefix that all stored objects share: "{endpoint}/{bucket}/"
  const urlPrefix = `${endpoint.replace(/\/$/, "")}/${bucket}/`

  try {
    console.log(`${C.dim}Listing S3 objects in "${bucket}"…${C.reset}`)
    const s3Objects = await listAllObjects(s3, bucket)
    const s3KeySet = new Set(s3Objects.map((o) => o.key))

    console.log(
      `${C.dim}Querying database for stored image URLs…${C.reset}`
    )

    // Collect all URL-bearing records from the three relevant models in parallel
    const [photos, usersWithAvatar, ticketMsgs] = await Promise.all([
      db.filePhoto.findMany({ select: { fileId: true, url: true } }),
      db.user.findMany({
        where: { avatarUrl: { not: null } },
        select: { id: true, avatarUrl: true },
      }),
      db.ticketMessage.findMany({
        where: { attachmentUrl: { not: null } },
        select: { id: true, attachmentUrl: true },
      }),
    ])

    // Flatten into a uniform list of { entityId, fieldName, url }
    interface DbUrlEntry {
      entityId: string
      fieldName: string
      url: string
    }

    const dbEntries: DbUrlEntry[] = [
      ...photos.map((p) => ({
        entityId: p.fileId,
        fieldName: "FilePhoto.url",
        url: p.url,
      })),
      ...usersWithAvatar
        .filter((u): u is typeof u & { avatarUrl: string } => u.avatarUrl !== null)
        .map((u) => ({
          entityId: u.id,
          fieldName: "User.avatarUrl",
          url: u.avatarUrl,
        })),
      ...ticketMsgs
        .filter(
          (m): m is typeof m & { attachmentUrl: string } =>
            m.attachmentUrl !== null
        )
        .map((m) => ({
          entityId: m.id,
          fieldName: "TicketMessage.attachmentUrl",
          url: m.attachmentUrl,
        })),
    ]

    // Build the set of keys that DB records currently reference, and collect
    // broken refs along the way
    const dbKeySet = new Set<string>()
    const brokenRefs: BrokenRef[] = []

    for (const entry of dbEntries) {
      const key = urlToKey(entry.url, urlPrefix)

      if (key === null) {
        // URL does not match the expected storage prefix — skip silently.
        // This can happen if the storage endpoint was changed after upload.
        continue
      }

      dbKeySet.add(key)

      if (!s3KeySet.has(key)) {
        brokenRefs.push({
          fileId: entry.entityId,
          fieldName: entry.fieldName,
          url: entry.url,
        })
      }
    }

    // Orphaned: S3 objects with no matching DB reference
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const orphaned: OrphanedObject[] = s3Objects
      .filter((obj) => !dbKeySet.has(obj.key))
      .map((obj) => ({
        key: obj.key,
        sizeMb: parseFloat(obj.sizeMb.toFixed(4)),
        lastModified: obj.lastModified.toISOString(),
        olderThan24h: obj.lastModified < cutoff24h,
      }))

    const orphanedFreshCount = orphaned.filter((o) => !o.olderThan24h).length
    const totalSizeMb = parseFloat(
      s3Objects.reduce((acc, o) => acc + o.sizeMb, 0).toFixed(2)
    )

    const output: StorageAuditOutput = {
      timestamp: new Date().toISOString(),
      summary: {
        totalObjects: s3Objects.length,
        totalSizeMb,
        orphanedCount: orphaned.length,
        orphanedFreshCount,
        brokenRefCount: brokenRefs.length,
      },
      orphaned,
      brokenRefs,
    }

    // Write JSON report
    const reportsDir = path.resolve(process.cwd(), "scripts", "reports")
    fs.mkdirSync(reportsDir, { recursive: true })
    const stamp = output.timestamp.replace(/[:.]/g, "-").slice(0, 19)
    const reportPath = path.join(reportsDir, `storage-audit-${stamp}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(output, null, 2), "utf-8")

    // Console output
    console.log(JSON.stringify(output, null, 2))
    console.log()
    printSummary(output, reportPath)

    const staleOrphans = orphaned.filter((o) => o.olderThan24h).length
    if (brokenRefs.length > 0 || staleOrphans > 0) process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err)
  process.exit(1)
})
