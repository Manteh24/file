"use client"

import { useState } from "react"
import { Share2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Agent {
  id: string
  displayName: string
}

interface ShareCustomerButtonProps {
  customerId: string
  agents: Agent[]
}

export function ShareCustomerButton({ customerId, agents }: ShareCustomerButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleShare(agentId: string) {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/crm/${customerId}/share-to-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: "success", text: "مشتری با موفقیت به مشاور معرفی شد" })
        setOpen(false)
      } else {
        setMessage({ type: "error", text: data.error ?? "خطایی رخ داد" })
      }
    } catch {
      setMessage({ type: "error", text: "خطا در اتصال به سرور" })
    } finally {
      setLoading(false)
    }
  }

  if (agents.length === 0) return null

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        <Share2 className="h-4 w-4 rtl:ml-1.5" />
        معرفی به مشاور
        <ChevronDown className="h-3 w-3 rtl:mr-1.5 ltr:ml-1.5" />
      </Button>

      {open && (
        <div className="overlay absolute top-full mt-1 z-20 min-w-48" style={{ right: 0 }}>
          <div className="py-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleShare(agent.id)}
                disabled={loading}
                className="w-full text-start px-4 py-2.5 text-sm hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-50"
              >
                {agent.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-1 text-xs ${message.type === "success" ? "text-emerald-600" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
