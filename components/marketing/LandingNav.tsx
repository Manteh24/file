import Link from "next/link"
import { AppLogo } from "./AppLogo"

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo + wordmark — first in DOM = right side in RTL */}
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={36} />
          <span className="text-lg font-bold text-slate-800">املاک‌بین</span>
        </Link>

        {/* Actions — second in DOM = left side in RTL */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ورود
          </Link>
          <Link
            href="/register?plan=PRO"
            className="inline-flex h-9 items-center justify-center rounded-full bg-teal-500 px-5 text-sm font-medium text-white transition-all hover:bg-teal-600 hover:scale-105"
          >
            ثبت‌نام رایگان
          </Link>
        </div>
      </div>
    </nav>
  )
}
