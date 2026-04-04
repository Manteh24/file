"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { Plan } from "@/types"

interface ManagerIsAgentToggleProps {
  initialValue: boolean
  plan: Plan
}

export function ManagerIsAgentToggle({ initialValue, plan }: ManagerIsAgentToggleProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // FREE plan: toggle is always true and cannot be changed
  const isFree = plan === "FREE"

  async function handleChange(next: boolean) {
    if (isFree) return
    setSaving(true)
    setError(null)
    try {
      // Fetch current office profile so we can re-submit with all required fields
      const getRes = await fetch("/api/settings")
      const getData: {
        success: boolean
        data?: {
          office: {
            name: string
            phone: string | null
            email: string | null
            address: string | null
            city: string | null
            officeBio: string | null
            photoEnhancementMode: string
            watermarkMode: string
          }
        }
      } = await getRes.json()

      if (!getData.success || !getData.data) {
        setError("خطا در بارگذاری اطلاعات دفتر")
        return
      }

      const { name, phone, email, address, city, officeBio, photoEnhancementMode, watermarkMode } =
        getData.data.office

      const patchRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone ?? "",
          email: email ?? "",
          address: address ?? "",
          city: city ?? "",
          officeBio: officeBio ?? "",
          photoEnhancementMode,
          watermarkMode,
          managerIsAgent: next,
        }),
      })

      const patchData: { success: boolean; error?: string } = await patchRes.json()
      if (!patchData.success) {
        setError(patchData.error ?? "خطا در ذخیره")
        return
      }

      setValue(next)
      router.refresh()
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-1">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">مدیر دفتر به عنوان مشاور</Label>
          <p className="text-xs text-muted-foreground">
            نام شما در لیست مشاوران نمایش داده می‌شود و فایل‌های جدید به شما اختصاص می‌یابند
          </p>
        </div>
        <Switch
          checked={isFree ? true : value}
          onCheckedChange={handleChange}
          disabled={isFree || saving}
        />
      </div>
      {isFree && (
        <p className="text-xs text-muted-foreground pt-1">
          در پلن رایگان این گزینه همیشه فعال است
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
