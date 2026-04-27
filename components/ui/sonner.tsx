"use client"

import { useEffect, useState } from "react"
import { Toaster as SonnerToaster } from "sonner"

type Theme = "light" | "dark"

function getDocumentTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function Toaster() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    setTheme(getDocumentTheme())

    const observer = new MutationObserver(() => {
      setTheme(getDocumentTheme())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <SonnerToaster
      position="top-center"
      dir="rtl"
      theme={theme}
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: "inherit",
        },
      }}
    />
  )
}
