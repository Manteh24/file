import { PricingCards } from "./PricingCards"
import { getEffectivePlanPrices } from "@/lib/plan-pricing"

export default async function PricingPage() {
  const { toman } = await getEffectivePlanPrices()
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">قیمت‌گذاری ساده و شفاف</h1>
          <p className="text-muted-foreground">
            بدون قرارداد بلندمدت — هر زمان که خواستید ارتقا یا تغییر بدهید
          </p>
        </div>
        <PricingCards prices={toman} />
      </div>
    </div>
  )
}
