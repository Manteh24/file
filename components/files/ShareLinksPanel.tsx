"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Link2, Copy, Check, Loader2, Eye, Plus, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmsPanel } from "@/components/shared/SmsPanel"
import { PriceInput } from "@/components/forms/PriceInput"
import { buildFileShareMessage } from "@/lib/sms"

interface ShareLink {
  id: string
  token: string
  customPrice: number | null
  viewCount: number
  isActive: boolean
  createdAt: string
  createdBy: { displayName: string }
}

interface Contact {
  name: string | null
  phone: string
}

interface ShareLinksPanelProps {
  fileId: string
  role: "MANAGER" | "AGENT"
  contacts?: Contact[]
  agentName?: string
  officeName?: string
}

function getShareUrl(token: string): string {
  // Use NEXT_PUBLIC_SHARE_DOMAIN if configured, otherwise fall back to current origin
  const base =
    process.env.NEXT_PUBLIC_SHARE_DOMAIN?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "")
  return `${base}/p/${token}`
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("fa-IR")} تومان`
}

export function ShareLinksPanel({
  fileId,
  role,
  contacts,
  agentName = "",
  officeName = "",
}: ShareLinksPanelProps) {
  const router = useRouter()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [creating, setCreating] = useState(false)
  const [customPriceInput, setCustomPriceInput] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Copy state — tracks which token was just copied
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Deactivating state
  const [deactivating, setDeactivating] = useState<string | null>(null)

  // SMS panel state — tracks which link's SMS panel is currently open
  const [smsOpenForLink, setSmsOpenForLink] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${fileId}/share-links`)
      const body = await res.json()
      if (body.success) {
        setLinks(body.data as ShareLink[])
      } else {
        setError("خطا در دریافت لینک‌ها")
      }
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }, [fileId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  async function copyToClipboard(token: string) {
    try {
      await navigator.clipboard.writeText(getShareUrl(token))
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      // Clipboard API not available — silently ignore
    }
  }

  async function createLink() {
    setSaving(true)
    setCreateError(null)

    const customPrice = customPriceInput ?? null

    try {
      const res = await fetch(`/api/files/${fileId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPrice }),
      })
      const body = await res.json()
      if (!body.success) {
        setCreateError(body.error ?? "خطا در ایجاد لینک")
        return
      }
      // Prepend new link and close form
      setLinks((prev) => [body.data as ShareLink, ...prev])
      setCreating(false)
      setCustomPriceInput(undefined)
      router.refresh()
    } catch {
      setCreateError("خطا در ارتباط با سرور")
    } finally {
      setSaving(false)
    }
  }

  async function deactivateLink(id: string) {
    setDeactivating(id)
    try {
      const res = await fetch(`/api/share-links/${id}`, { method: "PATCH" })
      const body = await res.json()
      if (body.success) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? { ...l, isActive: false } : l))
        )
        // Close SMS panel if it was open for this link
        if (smsOpenForLink === id) setSmsOpenForLink(null)
        router.refresh()
      }
    } catch {
      // Silently ignore — UI state stays; user can retry
    } finally {
      setDeactivating(null)
    }
  }

  function buildSmsMessage(link: ShareLink): string {
    return buildFileShareMessage({
      agentName,
      officeName,
      link: getShareUrl(link.token),
      price: link.customPrice != null ? formatPrice(link.customPrice) : undefined,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          لینک‌های اشتراک
        </CardTitle>
        {!creating && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5 rtl:ml-1 ltr:mr-1" />
            لینک جدید
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Create form */}
        {creating && (
          <div className="rounded-lg border bg-accent/30 p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">ایجاد لینک اشتراک جدید</p>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                قیمت سفارشی (تومان) — اختیاری
              </label>
              <PriceInput
                value={customPriceInput}
                onChange={setCustomPriceInput}
                placeholder="خالی = نمایش قیمت اصلی فایل"
                className="py-1.5 text-sm"
              />
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={createLink} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" />}
                ایجاد لینک
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreating(false)
                  setCustomPriceInput(undefined)
                  setCreateError(null)
                }}
                disabled={saving}
              >
                انصراف
              </Button>
            </div>
          </div>
        )}

        {/* Links list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">
            هیچ لینکی ایجاد نشده است
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className={`rounded-lg border ${!link.isActive ? "opacity-50" : ""}`}
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      {/* Token preview — truncated */}
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {link.token.slice(0, 8)}…
                      </p>
                      {link.customPrice != null && (
                        <p className="text-xs text-primary font-medium">
                          قیمت: {formatPrice(link.customPrice)}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {link.viewCount.toLocaleString("fa-IR")} بازدید
                        </span>
                        <span>توسط {link.createdBy.displayName}</span>
                        {!link.isActive && (
                          <span className="text-destructive font-medium">غیرفعال</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1.5">
                      {link.isActive && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => copyToClipboard(link.token)}
                            title="کپی لینک"
                          >
                            {copiedToken === link.token ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {/* SMS button */}
                          <Button
                            size="sm"
                            variant={smsOpenForLink === link.id ? "default" : "outline"}
                            className="h-7 px-2"
                            onClick={() =>
                              setSmsOpenForLink((prev) =>
                                prev === link.id ? null : link.id
                              )
                            }
                            title="ارسال پیامک"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          {role === "MANAGER" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => deactivateLink(link.id)}
                              disabled={deactivating === link.id}
                              title="غیرفعال‌سازی"
                            >
                              {deactivating === link.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "غیرفعال"
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline SMS panel — shown when SMS button is toggled */}
                  {link.isActive && smsOpenForLink === link.id && (
                    <div className="border-t pt-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        ارسال لینک از طریق پیامک
                      </p>
                      <SmsPanel
                        defaultMessage={buildSmsMessage(link)}
                        contacts={contacts}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
