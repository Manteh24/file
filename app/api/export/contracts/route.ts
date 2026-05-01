import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"
import { csvFilename, csvHeaders, formatJalaliDate, toCsv } from "@/lib/export"

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  PRE_SALE: "پیش‌فروش",
  LONG_TERM_RENT: "اجاره",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
  }
  if (!canOfficeDo(session.user, "viewContracts")) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }
  const { officeId } = session.user
  if (!officeId) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }

  const contracts = await db.contract.findMany({
    where: { officeId },
    select: {
      id: true,
      transactionType: true,
      finalPrice: true,
      commissionAmount: true,
      agentShare: true,
      officeShare: true,
      finalizedAt: true,
      file: { select: { address: true, neighborhood: true } },
      finalizedBy: { select: { displayName: true } },
    },
    orderBy: { finalizedAt: "desc" },
  })

  const rows = contracts.map((c) => ({
    id: c.id,
    transactionType: TRANSACTION_LABELS[c.transactionType] ?? c.transactionType,
    finalPrice: c.finalPrice.toString(),
    commission: c.commissionAmount.toString(),
    officeShare: c.officeShare.toString(),
    agentShare: c.agentShare.toString(),
    address: c.file?.address ?? "",
    neighborhood: c.file?.neighborhood ?? "",
    finalizedBy: c.finalizedBy?.displayName ?? "",
    finalizedAt: formatJalaliDate(c.finalizedAt),
  }))

  const csv = toCsv(rows, [
    { key: "id", label: "شناسه" },
    { key: "transactionType", label: "نوع معامله" },
    { key: "finalPrice", label: "قیمت نهایی" },
    { key: "commission", label: "کمیسیون" },
    { key: "officeShare", label: "سهم آژانس" },
    { key: "agentShare", label: "سهم مشاور" },
    { key: "address", label: "آدرس" },
    { key: "neighborhood", label: "محله" },
    { key: "finalizedBy", label: "نهایی‌کننده" },
    { key: "finalizedAt", label: "تاریخ نهایی شدن" },
  ])

  return new Response(csv, { headers: csvHeaders(csvFilename("contracts")) })
}
