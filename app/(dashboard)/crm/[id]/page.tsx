import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Pencil, Phone, Mail } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { CustomerNoteForm } from "@/components/crm/CustomerNoteForm"
import { CustomerNoteList } from "@/components/crm/CustomerNoteList"
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton"
import { SmsPanel } from "@/components/shared/SmsPanel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export default async function CustomerPage({ params }: CustomerPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const { officeId, role } = session.user

  const customer = await db.customer.findFirst({
    where: { id, officeId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      type: true,
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
  })

  if (!customer) notFound()

  const isManager = role === "MANAGER" || role === "SUPER_ADMIN" || role === "MID_ADMIN"

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={customer.name}
        description={`ثبت شده توسط ${customer.createdBy.displayName} · ${formatJalali(new Date(customer.createdAt))}`}
        actions={
          <div className="flex gap-2">
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
        <Badge>{customerTypeLabels[customer.type as CustomerType]}</Badge>

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

      {/* Custom outreach SMS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">ارسال پیامک</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <SmsPanel defaultPhone={customer.phone} defaultMessage="" />
        </CardContent>
      </Card>
    </div>
  )
}
