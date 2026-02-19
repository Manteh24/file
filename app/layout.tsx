import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

// Vazirmatn is the standard Persian variable font.
// The font file must be placed at public/fonts/Vazirmatn-VF.woff2
// Download from: https://github.com/rastikerdar/vazirmatn/releases
const vazirmatn = localFont({
  src: "../public/fonts/Vazirmatn-VF.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
})

export const metadata: Metadata = {
  title: "املاک‌یار",
  description: "سیستم مدیریت دفتر املاک",
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  )
}
