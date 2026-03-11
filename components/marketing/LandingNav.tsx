import Link from "next/link"

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {/* Outer halo */}
      <ellipse cx="28" cy="28" rx="26" ry="16" fill="rgba(20,184,166,0.06)" />
      {/* Eye shape */}
      <path
        d="M5 28C5 28 14 13 28 13C42 13 51 28 51 28C51 28 42 43 28 43C14 43 5 28 5 28Z"
        fill="#162332"
        stroke="#14B8A6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Iris glow */}
      <circle cx="28" cy="28" r="9" fill="rgba(20,184,166,0.08)" />
      {/* Buildings */}
      <rect x="18" y="25" width="5" height="12" rx="0.5" fill="#14B8A6" />
      <rect x="25" y="20" width="6" height="17" rx="0.5" fill="#14B8A6" />
      <rect x="33" y="26" width="5" height="11" rx="0.5" fill="#14B8A6" />
      {/* Windows — left building */}
      <rect x="19.5" y="26.5" width="2" height="2" rx="0.3" fill="#0F1923" />
      <rect x="19.5" y="30" width="2" height="2" rx="0.3" fill="#0F1923" />
      {/* Windows — center building */}
      <rect x="26.5" y="21.5" width="2.5" height="2" rx="0.3" fill="#0F1923" />
      <rect x="26.5" y="25.5" width="2.5" height="2" rx="0.3" fill="#0F1923" />
      <rect x="26.5" y="29.5" width="2.5" height="2" rx="0.3" fill="#0F1923" />
      {/* Windows — right building */}
      <rect x="34.5" y="27.5" width="2" height="2" rx="0.3" fill="#0F1923" />
      <rect x="34.5" y="31" width="2" height="2" rx="0.3" fill="#0F1923" />
      {/* Pupil */}
      <circle cx="28" cy="28" r="3" fill="rgba(20,184,166,0.35)" />
      <circle cx="30" cy="26" r="1.2" fill="rgba(255,255,255,0.25)" />
    </svg>
  )
}

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

        {/* Logo — right side (RTL: start side) */}
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-bold text-[#F1F5F9]">املاک‌بین</span>
        </Link>
      </div>
    </nav>
  )
}
