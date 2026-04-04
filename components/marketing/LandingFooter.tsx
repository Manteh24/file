import Link from "next/link"

// Simple SVG social icons (Telegram, Instagram, LinkedIn — relevant for Iran)
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

const footerLinks = [
  {
    heading: "محصول",
    links: [
      { label: "ویژگی‌ها", href: "#features" },
      { label: "قیمت‌گذاری", href: "#pricing" },
      { label: "سوالات متداول", href: "#faq" },
      { label: "بلاگ", href: "/blog" },
    ],
  },
  {
    heading: "حساب",
    links: [
      { label: "ورود", href: "/login" },
      { label: "ثبت‌نام رایگان", href: "/register" },
      { label: "دوره آزمایشی", href: "/register?plan=PRO" },
    ],
  },
  {
    heading: "شرکت",
    links: [
      { label: "درباره ما", href: "/about" },
      { label: "تماس با ما", href: "/contact" },
      { label: "پشتیبانی", href: "/contact" },
      { label: "حریم خصوصی", href: "/privacy" },
      { label: "شرایط استفاده", href: "/terms" },
    ],
  },
]

export function LandingFooter() {
  return (
    <footer dir="rtl" style={{ background: "#1C1917" }}>
      {/* Main footer content */}
      <div className="container mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo-white.png" alt="املاکبین" className="h-9 w-9 rounded-xl" />
              <span className="text-lg font-semibold text-white">املاک‌بین</span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed mb-6">
              پلتفرم مدیریت دفتر املاک برای مشاوران و مدیران — فارسی، RTL، و طراحی‌شده برای بازار ایران.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="تلگرام"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-stone-400 transition-colors hover:bg-white/20 hover:text-white"
              >
                <TelegramIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="اینستاگرام"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-stone-400 transition-colors hover:bg-white/20 hover:text-white"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="لینکدین"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-stone-400 transition-colors hover:bg-white/20 hover:text-white"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500">
            © ۱۴۰۴ املاک‌بین — تمامی حقوق محفوظ است
          </p>
          <p className="text-xs text-stone-600">
            ساخته‌شده با ❤️ برای دفاتر املاک ایران
          </p>
        </div>
      </div>
    </footer>
  )
}
