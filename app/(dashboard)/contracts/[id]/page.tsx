import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { MapPin, User, Calendar, Banknote } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { ContractSmsActions } from "@/components/contracts/ContractSmsActions"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { formatToman, formatJalali, bigIntToNumber } from "@/lib/utils"
import type { TransactionType, PropertyType } from "@/types"

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "تجاری",
  OFFICE: "اداری",
  OTHER: "سایر",
}

interface ContractPageProps {
  params: Promise<{ id: string }>
}

export default async function ContractPage({ params }: ContractPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params
  const { officeId } = session.user

  const contract = await db.contract.findFirst({
    where: { id, officeId },
    select: {
      id: true,
      transactionType: true,
      finalPrice: true,
      commissionAmount: true,
      agentShare: true,
      officeShare: true,
      notes: true,
      finalizedAt: true,
      office: { select: { name: true } },
      file: {
        select: {
          id: true,
          address: true,
          neighborhood: true,
          propertyType: true,
          status: true,
          area: true,
          assignedAgents: {
            select: { user: { select: { displayName: true } } },
          },
          contacts: { select: { name: true, phone: true } },
        },
      },
      finalizedBy: { select: { displayName: true } },
    },
  })

  if (!contract) notFound()

  // Convert BigInt price fields to Number for rendering and formatToman()
  const c = bigIntToNumber(contract)

  const locationLabel =
    [contract.file.neighborhood, contract.file.address].filter(Boolean).join("، ") ||
    "آدرس ثبت نشده"

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="جزئیات قرارداد"
        description={`ثبت شده در ${formatJalali(new Date(contract.finalizedAt))}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/files/${contract.file.id}`}>مشاهده فایل</Link>
          </Button>
        }
      />

      {/* Transaction type + status */}
      <div className="flex items-center gap-3">
        <Badge className="text-sm px-3 py-1">
          {transactionTypeLabels[contract.transactionType as TransactionType]}
        </Badge>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          قرارداد نهایی شده
        </Badge>
      </div>

      {/* Property info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold text-base">اطلاعات ملک</h2>

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <span>{locationLabel}</span>
        </div>

        {contract.file.propertyType && (
          <p className="text-sm text-muted-foreground">
            نوع ملک: {propertyTypeLabels[contract.file.propertyType as PropertyType]}
          </p>
        )}

        {contract.file.area && (
          <p className="text-sm text-muted-foreground">
            متراژ: {contract.file.area.toLocaleString("fa-IR")} متر مربع
          </p>
        )}

        {contract.file.assignedAgents.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>
              مشاوران: {contract.file.assignedAgents.map((a) => a.user.displayName).join("، ")}
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Financial details */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          اطلاعات مالی
        </h2>

        <div className="rounded-lg border divide-y">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">قیمت نهایی معامله</span>
            <span className="font-semibold">{formatToman(c.finalPrice)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">کمیسیون کل</span>
            <span className="font-semibold">{formatToman(c.commissionAmount)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">سهم مشاور</span>
            <span>{formatToman(c.agentShare)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">سهم دفتر</span>
            <span>{formatToman(c.officeShare)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {contract.notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h2 className="font-semibold text-base">توضیحات</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
          </div>
        </>
      )}

      <Separator />

      {/* Metadata */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 shrink-0" />
        <span>
          ثبت شده توسط {contract.finalizedBy.displayName} در{" "}
          {formatJalali(new Date(contract.finalizedAt))}
        </span>
      </div>

      <Separator />

      {/* SMS actions — rating request and rent follow-up */}
      <ContractSmsActions
        contacts={contract.file.contacts}
        agentName={contract.finalizedBy.displayName}
        officeName={contract.office.name}
        transactionType={contract.transactionType}
      />
    </div>
  )
}
