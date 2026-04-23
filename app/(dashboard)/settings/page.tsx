import { redirect } from "next/navigation"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OfficeProfileForm } from "@/components/settings/OfficeProfileForm"
import { SubscriptionCard } from "@/components/settings/SubscriptionCard"
import { UserPhoneForm } from "@/components/settings/UserPhoneForm"
import { PlanUsageSummary } from "@/components/dashboard/PlanUsageSummary"
import { WelcomeModal } from "@/components/settings/WelcomeModal"
import { ManagerIsAgentToggle } from "@/components/settings/ManagerIsAgentToggle"
import type { OfficeProfile, SubscriptionInfo } from "@/types"

interface SettingsPageProps {
  searchParams: Promise<{ payment?: string; plan?: string }>
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
  if (!officeId) redirect("/admin/dashboard")
  const params = await searchParams

  const [office, subscription, currentUser] = await Promise.all([
    db.office.findUnique({
      where: { id: officeId },
      select: { id: true, name: true, phone: true, email: true, address: true, city: true, officeBio: true, logoUrl: true, photoEnhancementMode: true, watermarkMode: true, managerIsAgent: true },
    }),
    db.subscription.findUnique({
      where: { officeId },
      select: { plan: true, status: true, isTrial: true, billingCycle: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    }),
  ])

  if (!office) redirect("/dashboard")

  const officeProfile: OfficeProfile = office
  const subscriptionInfo: SubscriptionInfo | null = subscription

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-0 md:px-4">
      <PageHeader
        title="تنظیمات"
        description="مدیریت پروفایل دفتر و اشتراک"
      />

      {params.payment === "success" && (
        <WelcomeModal
          open
          plan={
            params.plan === "PRO" || params.plan === "TEAM"
              ? params.plan
              : (subscriptionInfo?.plan ?? "FREE")
          }
        />
      )}

      {params.payment && (
        <PaymentStatusBanner status={params.payment} />
      )}

      {/* Section: Office profile */}
      <section>
        <div className="mb-4 border-b border-border pb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            اطلاعات دفتر
          </h2>
        </div>
        <OfficeProfileForm initialData={officeProfile} />
        <div className="mt-6">
          <ManagerIsAgentToggle
            initialValue={officeProfile.managerIsAgent}
            plan={subscriptionInfo?.plan ?? "FREE"}
          />
        </div>
      </section>

      {/* Section: User profile (phone for password reset) */}
      <section>
        <div className="mb-4 border-b border-border pb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            پروفایل کاربری
          </h2>
        </div>
        <UserPhoneForm initialPhone={currentUser?.phone ?? null} />
      </section>

      {/* Section: Subscription */}
      <section id="billing">
        <div className="mb-4 border-b border-border pb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            اشتراک و پرداخت
          </h2>
        </div>
        <PlanUsageSummary />
        <div className="mt-4">
          <SubscriptionCard subscription={subscriptionInfo} />
        </div>
      </section>
    </div>
  )
}
