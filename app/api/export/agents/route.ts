import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"
import { OFFICE_ROLE_LABELS, type OfficeMemberRole } from "@/lib/office-permissions"
import { csvFilename, csvHeaders, formatJalaliDate, toCsv } from "@/lib/export"

export async function GET() {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
  }
  if (!canOfficeDo(session.user, "manageAgents")) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }
  const { officeId } = session.user
  if (!officeId) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }

  const agents = await db.user.findMany({
    where: { officeId, role: "AGENT" },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      isActive: true,
      officeMemberRole: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = agents.map((a) => ({
    id: a.id,
    displayName: a.displayName,
    username: a.username,
    role: a.officeMemberRole
      ? OFFICE_ROLE_LABELS[a.officeMemberRole as OfficeMemberRole] ?? a.officeMemberRole
      : "مشاور",
    phone: a.phone ?? "",
    isActive: a.isActive ? "فعال" : "غیرفعال",
    createdAt: formatJalaliDate(a.createdAt),
  }))

  const csv = toCsv(rows, [
    { key: "id", label: "شناسه" },
    { key: "displayName", label: "نام نمایشی" },
    { key: "username", label: "نام کاربری" },
    { key: "role", label: "نقش" },
    { key: "phone", label: "تلفن" },
    { key: "isActive", label: "وضعیت" },
    { key: "createdAt", label: "تاریخ عضویت" },
  ])

  return new Response(csv, { headers: csvHeaders(csvFilename("agents")) })
}
