import { db } from "@/lib/db"

interface NotificationInput {
  userId: string
  type: string
  title: string
  message: string
  fileId?: string
}

/**
 * Creates a single notification record.
 * Called outside of transactions — errors are logged but never propagated,
 * so notification failures never break the main operation.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        fileId: input.fileId ?? null,
      },
    })
  } catch (err) {
    console.error("[notifications] createNotification error:", err)
  }
}

/**
 * Creates multiple notification records in a single query.
 * Same fire-and-forget contract as createNotification.
 */
export async function createManyNotifications(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return
  try {
    await db.notification.createMany({
      data: inputs.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        fileId: n.fileId ?? null,
      })),
    })
  } catch (err) {
    console.error("[notifications] createManyNotifications error:", err)
  }
}
