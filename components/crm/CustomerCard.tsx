import Link from "next/link"
import { Phone, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatJalali } from "@/lib/utils"
import type { CustomerSummary, CustomerType } from "@/types"

interface CustomerCardProps {
  customer: CustomerSummary
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

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link href={`/crm/${customer.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
            <Badge variant={customerTypeVariants[customer.type]} className="shrink-0">
              {customerTypeLabels[customer.type]}
            </Badge>
          </div>

          {/* Phone */}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0 rtl:ml-1" />
            <span dir="ltr">{customer.phone}</span>
          </p>

          {/* Footer: note count + date */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 rtl:ml-1" />
              {customer._count.contactLogs.toLocaleString("fa-IR")} یادداشت
            </span>
            <span>{formatJalali(new Date(customer.createdAt))}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
