"use client"

import { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

// Last-resort error boundary. Wraps the entire app, so it MUST render its own
// <html> and <body> — Next.js does not provide them at this level.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[app/global-error.tsx]", error)
  }, [error])

  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "var(--font-iran-yekan), sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "#FAFAF9",
            color: "#1C1917",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 28 * 16 }}>
            <p style={{ fontSize: "4.5rem", fontWeight: 700, color: "#E11D48", margin: 0 }}>!</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "1.5rem" }}>
              برنامه با مشکل مواجه شد
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#57534E", marginTop: "0.5rem" }}>
              صفحه را بازخوانی کنید. اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                background: "#14B8A6",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
