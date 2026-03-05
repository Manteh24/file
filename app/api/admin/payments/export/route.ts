import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { paymentFiltersSchema } from "@/lib/validations/admin"

const PLAN_LABELS: Record<string, string> = { FREE: "رایگان", PRO: "حرفه‌ای", TEAM: "تیم" }
const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  VERIFIED: "تأیید شده",
  FAILED: "ناموفق",
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return new Response("Forbidden", { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = paymentFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return new Response("Bad Request", { status: 400 })

  const { status, dateFrom, dateTo, officeId: filterOfficeId } = parsed.data

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const where = {
    office: officeFilter,
    ...(status ? { status } : {}),
    ...(filterOfficeId ? { officeId: filterOfficeId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  }

  const payments = await db.paymentRecord.findMany({
    where,
    select: {
      plan: true,
      billingCycle: true,
      amount: true,
      status: true,
      refId: true,
      createdAt: true,
      office: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10000,
  })

  const header = "تاریخ,دفتر,پلن,چرخه صورتحساب,مبلغ (تومان),وضعیت,شماره مرجع\n"
  const rows = payments.map((p) => {
    const date = format(new Date(p.createdAt), "yyyy/MM/dd")
    const amountToman = Math.floor(p.amount / 10)
    const cycle = p.billingCycle === "ANNUAL" ? "سالانه" : "ماهانه"
    const cols = [
      date,
      p.office.name.replace(/,/g, "،"),
      PLAN_LABELS[p.plan] ?? p.plan,
      cycle,
      amountToman.toLocaleString("fa-IR"),
      STATUS_LABELS[p.status] ?? p.status,
      p.refId ?? "",
    ]
    return cols.join(",")
  })

  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF"
  const csv = bom + header + rows.join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${format(new Date(), "yyyyMMdd")}.csv"`,
    },
  })
}
