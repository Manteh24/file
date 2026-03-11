import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#0F1923] py-10 px-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <p className="font-bold text-[#F1F5F9]">املاک‌بین</p>
        <p className="text-[#475569]">© ۱۴۰۴ — تمامی حقوق محفوظ است</p>
        <div className="flex gap-5">
          <Link href="/login" className="text-[#94A3B8] transition-colors hover:text-[#14B8A6]">
            ورود
          </Link>
          <Link href="/register" className="text-[#94A3B8] transition-colors hover:text-[#14B8A6]">
            ثبت‌نام
          </Link>
        </div>
      </div>
    </footer>
  )
}
