import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

// S3-compatible object storage client (IranServer)
// forcePathStyle is required for non-AWS S3-compatible providers.
const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: "us-east-1", // dummy region — required by SDK but ignored by S3-compatible providers
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.STORAGE_BUCKET_NAME!

/** Base URL for public access to stored objects. Trailing slash stripped for consistency. */
function getBaseUrl(): string {
  return process.env.STORAGE_ENDPOINT!.replace(/\/$/, "")
}

/**
 * Uploads a buffer to object storage and returns its public URL.
 *
 * @param key         Storage key, e.g. `photos/office123/file456/abc.jpg`
 * @param buffer      File content
 * @param contentType MIME type, e.g. `image/jpeg`
 * @returns           Public URL to the stored object
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )
  return `${getBaseUrl()}/${BUCKET}/${key}`
}

/**
 * Deletes an object from storage.
 * Accepts either a full public URL (as stored in FilePhoto.url) or a bare key.
 */
export async function deleteFile(urlOrKey: string): Promise<void> {
  const prefix = `${getBaseUrl()}/${BUCKET}/`
  const key = urlOrKey.startsWith(prefix) ? urlOrKey.slice(prefix.length) : urlOrKey
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

/**
 * Generates a unique storage key for a property photo.
 * Format: `photos/{officeId}/{fileId}/{timestamp}-{random}.jpg`
 */
export function generatePhotoKey(officeId: string, fileId: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `photos/${officeId}/${fileId}/${Date.now()}-${random}.jpg`
}

/**
 * Generates a unique storage key for a ticket attachment.
 * Format: `ticket-attachments/{officeId}/{ticketId}/{timestamp}-{random}.jpg`
 */
export function generateTicketAttachmentKey(officeId: string, ticketId: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `ticket-attachments/${officeId}/${ticketId}/${Date.now()}-${random}.jpg`
}
