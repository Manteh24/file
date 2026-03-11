import Link from "next/link"
import { AppLogo } from "./AppLogo"

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0F1923]/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Actions — left side (RTL: end side) */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="nav-link-sweep text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
          >
            ورود
          </Link>
          <Link
            href="/register?plan=PRO"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#14B8A6] px-5 text-sm font-medium text-white transition-all hover:bg-[#0D9488] hover:scale-105"
          >
            ثبت‌نام رایگان
          </Link>
        </div>

        {/* Logo + wordmark — right side (RTL: start side) */}
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={32} />
          <span className="text-lg font-bold text-[#F1F5F9]">املاک‌بین</span>
        </Link>
      </div>
    </nav>
  )
}
