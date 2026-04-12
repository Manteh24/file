import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LandingNav } from "@/components/marketing/LandingNav"
import { HeroSection } from "@/components/marketing/HeroSection"
import { FeaturesSection } from "@/components/marketing/FeaturesSection"
import { PricingSection } from "@/components/marketing/PricingSection"
import { TrustStrip } from "@/components/marketing/TrustStrip"
import { FaqSection } from "@/components/marketing/FaqSection"
import { LandingFooter } from "@/components/marketing/LandingFooter"

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      {/* Remove dark class before paint — overrides root layout's localStorage script */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.remove('dark')` }} />
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <TrustStrip />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  )
}
