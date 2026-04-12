import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Pencil, Phone, Mail } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { CustomerNoteForm } from "@/components/crm/CustomerNoteForm"
import { CustomerNoteList } from "@/components/crm/CustomerNoteList"
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton"
import { CustomerShareLinksSection } from "@/components/crm/CustomerShareLinksSection"
import { CustomerContractsSection } from "@/components/crm/CustomerContractsSection"
import { ShareCustomerButton } from "@/components/crm/ShareCustomerButton"
import { CustomerSmsButton } from "@/components/crm/CustomerSmsButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatJalali } from "@/lib/utils"
import type { CustomerType, CustomerNote } from "@/types"

interface CustomerPageProps {
  params: Promise<{ id: string }>
}

const customerTypeLabels: Record<CustomerType, string> = {
  BUYER: "خریدار",
  RENTER: "مستأجر",
  SELLER: "فروشنده",
  LANDLORD: "موجر",
}

const customerTypeVariants: Record<CustomerType, "default" | "secondary" | "outline"> = {
  BUYER: "default",
  RENTER: "secondary",
  SELLER: "outline",
  LANDLORD: "secondary",
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const { officeId, role } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN" || role === "MID_ADMIN"

  // Parallel fetch: customer + agents (for share button, manager only)
  const [customer, agents] = await Promise.all([
    db.customer.findFirst({
      where: { id, officeId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        types: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { displayName: true } },
        contactLogs: {
          select: {
            id: true,
            customerId: true,
            content: true,
            createdAt: true,
            user: { select: { displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    isManager
      ? db.user.findMany({
          where: { officeId, role: "AGENT", isActive: true },
          select: { id: true, displayName: true },
          orderBy: { displayName: "asc" },
        })
      : Promise.resolve([]),
  ])

  if (!customer) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={customer.name}
        description={`ثبت شده توسط ${customer.createdBy.displayName} · ${formatJalali(new Date(customer.createdAt))}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            {isManager && agents.length > 0 && (
              <ShareCustomerButton customerId={id} agents={agents} />
            )}
            <CustomerSmsButton phone={customer.phone} customerName={customer.name} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/crm/${id}/edit`}>
                <Pencil className="h-4 w-4 rtl:ml-1.5" />
                ویرایش
              </Link>
            </Button>
            {isManager && (
              <DeleteCustomerButton customerId={id} customerName={customer.name} />
            )}
          </div>
        }
      />

      {/* Customer info */}
      <div className="rounded-lg border p-4 space-y-3">
        {/* Multi-type badges */}
        <div className="flex flex-wrap gap-1.5">
          {(customer.types as CustomerType[]).map((t) => (
            <Badge key={t} variant={customerTypeVariants[t]}>
              {customerTypeLabels[t]}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          <span dir="ltr">{customer.phone}</span>
        </div>

        {customer.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span dir="ltr">{customer.email}</span>
          </div>
        )}

        {customer.notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2 border-t">
            {customer.notes}
          </p>
        )}
      </div>

      <Separator />

      {/* Contact history */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">تاریخچه تماس</h2>
        <CustomerNoteForm customerId={id} />
        <CustomerNoteList notes={customer.contactLogs as CustomerNote[]} />
      </div>

      <Separator />

      {/* Share links sent to this customer */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">لینک‌های ارسال‌شده</h2>
        <CustomerShareLinksSection customerId={id} />
      </div>

      <Separator />

      {/* Contracts linked to this customer */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">قراردادها</h2>
        <CustomerContractsSection customerId={id} />
      </div>

    </div>
  )
}
