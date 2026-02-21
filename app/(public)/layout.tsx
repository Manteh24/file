// Public layout — no sidebar or topbar. Root layout provides RTL, font, and body.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
