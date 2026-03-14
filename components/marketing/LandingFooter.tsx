import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white py-10 px-6">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <p className="font-bold text-slate-800">املاک‌بین</p>
        <p className="text-slate-400">© ۱۴۰۴ — تمامی حقوق محفوظ است</p>
        <div className="flex gap-5">
          <Link href="/login" className="text-slate-500 transition-colors hover:text-teal-500">
            ورود
          </Link>
          <Link href="/register" className="text-slate-500 transition-colors hover:text-teal-500">
            ثبت‌نام
          </Link>
        </div>
      </div>
    </footer>
  )
}
