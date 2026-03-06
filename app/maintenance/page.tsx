export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="text-5xl mb-2">🔧</div>
        <h1 className="text-2xl font-bold">در حال به‌روزرسانی</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          پلتفرم موقتاً در حالت تعمیر و نگهداری قرار دارد.
          <br />
          لطفاً چند دقیقه دیگر مجدداً تلاش کنید.
        </p>
        <p className="text-xs text-muted-foreground/60 pt-4">
          اگر مدیر دفتر هستید، از طریق پنل مدیریت وارد شوید.
        </p>
      </div>
    </div>
  )
}
