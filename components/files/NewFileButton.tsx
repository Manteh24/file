"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { usePlanStatus } from "@/hooks/usePlanStatus"

interface NewFileButtonProps {
  role: "MANAGER" | "AGENT"
}

export function NewFileButton({ role }: NewFileButtonProps) {
  const { isAtLimit, isNearLimit, data } = usePlanStatus()
  const [showLimit, setShowLimit] = useState(false)

  const atLimit = isAtLimit("activeFiles")
  const nearLimit = isNearLimit("activeFiles")

  function handleClick(e: React.MouseEvent) {
    if (atLimit) {
      e.preventDefault()
      setShowLimit(true)
    }
  }

  return (
    <div className="space-y-2">
      {/* Soft amber warning when approaching limit */}
      {nearLimit && !atLimit && data && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
          به سقف فایل‌های فعال نزدیک می‌شوید ({data.usage.activeFiles.toLocaleString("fa-IR")} از {data.usage.activeFilesMax.toLocaleString("fa-IR")})
        </p>
      )}

      <Button asChild={!atLimit} onClick={handleClick}>
        {atLimit ? (
          <span className="flex items-center gap-1 opacity-60 cursor-not-allowed">
            <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
            فایل جدید
          </span>
        ) : (
          <Link href="/files/new">
            <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
            فایل جدید
          </Link>
        )}
      </Button>

      {showLimit && (
        <div className="mt-2">
          <UpgradePrompt reason="files" role={role} />
        </div>
      )}
    </div>
  )
}
