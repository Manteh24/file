import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { assignAgentsSchema } from "@/lib/validations/file"
import { createManyNotifications } from "@/lib/notifications"

// ─── PUT /api/files/[id]/agents ─────────────────────────────────────────────────
// Atomically replaces all agent assignments for a file. Manager-only.
// Sending an empty agentIds array removes all assignments.

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = assignAgentsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const { id: fileId } = await params
  const { officeId, id: userId } = session.user
  const { agentIds } = parsed.data

  try {
    // 1. Verify the file belongs to this office; also fetch current agents for the activity log diff
    const file = await db.propertyFile.findFirst({
      where: { id: fileId, officeId },
      select: {
        id: true,
        assignedAgents: {
          select: { userId: true, user: { select: { displayName: true } } },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
    }

    // 2. Validate all agentIds: must belong to this office, have AGENT role, and be active
    let newAgentNames: string[] = []
    if (agentIds.length > 0) {
      const validAgents = await db.user.findMany({
        where: { id: { in: agentIds }, officeId, role: "AGENT", isActive: true },
        select: { id: true, displayName: true },
      })

      if (validAgents.length !== agentIds.length) {
        return NextResponse.json(
          { success: false, error: "یک یا چند مشاور معتبر نیست" },
          { status: 400 }
        )
      }

      // Preserve client-sent order for the activity log
      const nameMap = new Map(validAgents.map((a) => [a.id, a.displayName]))
      newAgentNames = agentIds.map((id) => nameMap.get(id) ?? id)
    }

    const oldAgentNames = file.assignedAgents.map((a) => a.user.displayName)

    // 3. Replace assignments and log the change atomically
    await db.$transaction(async (tx) => {
      await tx.fileAssignment.deleteMany({ where: { fileId } })

      if (agentIds.length > 0) {
        await tx.fileAssignment.createMany({
          data: agentIds.map((uid) => ({ fileId, userId: uid })),
        })
      }

      await tx.activityLog.create({
        data: {
          fileId,
          userId,
          action: "ASSIGNMENT",
          diff: {
            agents: [oldAgentNames.join("، ") || "—", newAgentNames.join("، ") || "—"],
          },
        },
      })
    })

    // Fire-and-forget: notify agents who were newly added (not previously assigned)
    const oldAgentIds = new Set(file.assignedAgents.map((a) => a.userId))
    const newlyAddedIds = agentIds.filter((id) => !oldAgentIds.has(id))
    if (newlyAddedIds.length > 0) {
      await createManyNotifications(
        newlyAddedIds.map((agentId) => ({
          userId: agentId,
          type: "FILE_ASSIGNED",
          title: "فایل جدید به شما تخصیص داده شد",
          message: "مدیر دفتر یک فایل ملک را به شما اختصاص داده است.",
          fileId,
        }))
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[PUT /api/files/[id]/agents] error:", err)
    return NextResponse.json(
      { success: false, error: "خطا در تخصیص مشاوران" },
      { status: 500 }
    )
  }
}
