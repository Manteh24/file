"use client"

import { useState, useEffect } from "react"
import { Download, Share2, X } from "lucide-react"

type Platform = "android" | "ios"

// Extend the global BeforeInstallPromptEvent type (not in lib.dom.d.ts by default)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "pwa-install-dismissed"

export function PWAInstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already dismissed or already running as installed PWA
    if (
      localStorage.getItem(DISMISSED_KEY) === "1" ||
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS standalone (navigator.standalone is non-standard)
      (navigator as { standalone?: boolean }).standalone === true
    ) {
      return
    }

    const ua = navigator.userAgent
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream
    // Only show the iOS guide on Safari; Chrome/Firefox on iOS can't install PWAs
    const isIOSSafari =
      isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)

    if (isIOSSafari) {
      setPlatform("ios")
      setVisible(true)
      return
    }

    // Android / desktop Chrome — wait for the browser's native prompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      setPlatform("android")
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1")
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === "accepted") dismiss()
  }

  if (!visible || !platform) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-[8000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {platform === "ios" ? (
            <Share2 className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">نصب اپلیکیشن</p>
          {platform === "ios" ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              در سافاری روی{" "}
              <span className="font-medium text-foreground">دکمه Share</span> بزنید،
              سپس «افزودن به صفحه اصلی» را انتخاب کنید.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              اپ را روی دستگاه نصب کنید و بدون نیاز به مرورگر باز کنید.
            </p>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Install button — only for Android (iOS uses the manual share flow) */}
      {platform === "android" && (
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          نصب
        </button>
      )}
    </div>
  )
}
