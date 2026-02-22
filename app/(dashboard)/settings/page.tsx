import { redirect } from "next/navigation"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OfficeProfileForm } from "@/components/settings/OfficeProfileForm"
import { SubscriptionCard } from "@/components/settings/SubscriptionCard"
import type { OfficeProfile, SubscriptionInfo } from "@/types"

interface SettingsPageProps {
  searchParams: Promise<{ payment?: string }>
}

// Payment result banners shown after returning from Zarinpal
function PaymentStatusBanner({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
        <CheckCircle2 className="size-4 text-emerald-600" />
        <AlertDescription className="text-emerald-700">
          پرداخت با موفقیت انجام شد. اشتراک شما فعال گردید.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "already_verified") {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>این پرداخت قبلاً تایید شده است.</AlertDescription>
      </Alert>
    )
  }

  if (status === "cancelled") {
    return (
      <Alert>
        <AlertTriangle className="size-4" />
        <AlertDescription>پرداخت توسط شما لغو شد.</AlertDescription>
      </Alert>
    )
  }

  if (status === "failed" || status === "error") {
    return (
      <Alert variant="destructive">
        <XCircle className="size-4" />
        <AlertDescription>
          پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user
  const params = await searchParams

  const [office, subscription] = await Promise.all([
    db.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true, phone: true, email: true, address: true, city: true },
    }),
    db.subscription.findUnique({
      where: { officeId },
      select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
  ])

  if (!office) redirect("/dashboard")

  const officeProfile: OfficeProfile = office
  const subscriptionInfo: SubscriptionInfo | null = subscription

  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات"
        description="مدیریت پروفایل دفتر و اشتراک"
      />

      {params.payment && (
        <PaymentStatusBanner status={params.payment} />
      )}

      {/* Office Profile */}
      <Card>
        <CardHeader>
          <CardTitle>اطلاعات دفتر</CardTitle>
        </CardHeader>
        <CardContent>
          <OfficeProfileForm initialData={officeProfile} />
        </CardContent>
      </Card>

      {/* Billing & Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>اشتراک و پرداخت</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionCard subscription={subscriptionInfo} />
        </CardContent>
      </Card>
    </div>
  )
}
