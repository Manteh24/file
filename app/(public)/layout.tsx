// Public layout — no sidebar or topbar. Root layout provides RTL, font, and body.
// Forces light mode for marketing pages; the inline script runs before React hydrates
// so there is no dark-mode flash even if the user has dark=1 in localStorage.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.remove('dark')` }} />
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </>
  )
}
