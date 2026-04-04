import { LandingNav } from "@/components/marketing/LandingNav"
import { LandingFooter } from "@/components/marketing/LandingFooter"
import { MessageSquare, Mail, Clock } from "lucide-react"

export const metadata = { title: "تماس با ما — املاکبین" }

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  )
}

const channels = [
  {
    icon: TelegramIcon,
    title: "تلگرام",
    desc: "سریع‌ترین راه پاسخگویی — معمولاً ظرف چند ساعت",
    action: "ارتباط از طریق تلگرام",
    href: "#",
    teal: true,
  },
  {
    icon: Mail,
    title: "ایمیل",
    desc: "برای درخواست‌های رسمی و مستندات فنی",
    action: "support@amlakbin.ir",
    href: "mailto:support@amlakbin.ir",
    teal: false,
  },
  {
    icon: Clock,
    title: "ساعات پشتیبانی",
    desc: "شنبه تا چهارشنبه، ۹ صبح تا ۶ عصر",
    action: null,
    href: null,
    teal: false,
  },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-base)" }} dir="rtl">
      <LandingNav />

      <main className="flex-1">
        {/* Header */}
        <section className="py-20 px-6" style={{ background: "var(--color-surface-1)" }}>
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-widest text-[var(--color-teal-500)] mb-4">
              تماس با ما
            </p>
            <h1
              className="font-semibold text-[var(--color-text-primary)] leading-snug mb-5"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
            >
              چطور می‌توانیم کمک کنیم؟
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
              تیم پشتیبانی ما آماده پاسخگویی به سوالات، گزارش مشکلات، و راهنمایی شماست.
            </p>
          </div>
        </section>

        {/* Channels */}
        <section className="py-20 px-6" style={{ background: "var(--color-base)" }}>
          <div className="container mx-auto max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {channels.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 flex flex-col gap-4"
                >
                  <div
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "var(--color-teal-50)", color: "var(--color-teal-600)" }}
                  >
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
                      {c.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {c.desc}
                    </p>
                  </div>
                  {c.action && c.href && (
                    <a
                      href={c.href}
                      className="mt-auto inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                      style={
                        c.teal
                          ? { background: "var(--color-teal-500)", color: "white" }
                          : {
                              border: "1px solid var(--color-border-default)",
                              color: "var(--color-text-secondary)",
                            }
                      }
                    >
                      {c.action}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ nudge */}
        <section className="py-16 px-6" style={{ background: "var(--color-surface-2)" }}>
          <div className="container mx-auto max-w-2xl text-center">
            <MessageSquare
              className="mx-auto mb-4 h-8 w-8"
              style={{ color: "var(--color-teal-500)" }}
            />
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">
              سوال متداول دارید؟
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              پاسخ اکثر سوالات رایج را در بخش سوالات متداول می‌یابید.
            </p>
            <a
              href="/#faq"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-border-default)] px-6 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)]"
            >
              مشاهده سوالات متداول
            </a>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
