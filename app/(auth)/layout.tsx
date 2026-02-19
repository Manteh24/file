export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">املاک‌یار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            سیستم مدیریت دفتر املاک
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
