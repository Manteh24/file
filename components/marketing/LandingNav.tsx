"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { AppLogo } from "./AppLogo"

const navLinks = [
  { label: "ویژگی‌ها", href: "#features" },
  { label: "قیمت‌ها", href: "#pricing" },
  { label: "درباره ما", href: "#about" },
  { label: "تماس", href: "#contact" },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-white/90 backdrop-blur-sm border-b border-[var(--color-border-subtle)] shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          {/* RIGHT: Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <AppLogo size={32} variant="dark" />
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              املاک‌بین
            </span>
          </Link>

          {/* CENTER: Nav links (desktop) */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link-sweep text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* LEFT: Actions (desktop) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
            >
              ورود
            </Link>
            <Link
              href="/register?plan=PRO"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--color-teal-500)] px-5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-teal-600)]"
            >
              ثبت‌نام رایگان
            </Link>
          </div>

          {/* Mobile hamburger — right side in RTL (start) */}
          <button
            className="lg:hidden flex items-center justify-center rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
            onClick={() => setMenuOpen(true)}
            aria-label="باز کردن منو"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-surface-1)]" dir="rtl">
          <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--color-border-subtle)]">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
              <AppLogo size={32} variant="dark" />
              <span className="text-base font-semibold text-[var(--color-text-primary)]">
                املاک‌بین
              </span>
            </Link>
            <button
              className="flex items-center justify-center rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-colors"
              onClick={() => setMenuOpen(false)}
              aria-label="بستن منو"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1 p-4 flex-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-3 text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 p-4 border-t border-[var(--color-border-subtle)]">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--color-border-default)] text-sm font-semibold text-[var(--color-text-secondary)]"
              onClick={() => setMenuOpen(false)}
            >
              ورود
            </Link>
            <Link
              href="/register?plan=PRO"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--color-teal-500)] text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              ثبت‌نام رایگان
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
