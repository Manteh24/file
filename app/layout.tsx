import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const iranYekan = localFont({
  src: [
    {
      path: "../public/fonts/IRANYekanXFaNum-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-DemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-DemiBold.woff",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-iran-yekan",
  display: "swap",
})

export const metadata: Metadata = {
  title: "املاکبین",
  description: "سیستم مدیریت دفتر املاک",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-black.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" className={iranYekan.variable} suppressHydrationWarning>
      {/* Prevent dark mode flash: read localStorage before React hydrates */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    if(localStorage.getItem('dark')==='1'){
      document.documentElement.classList.add('dark');
    }
  } catch(e){}
})();
`,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
