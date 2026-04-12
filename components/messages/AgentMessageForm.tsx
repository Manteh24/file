"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Agent {
  id: string
  displayName: string
}

interface AgentMessageFormProps {
  agents: Agent[]
  onSent?: () => void
}

export function AgentMessageForm({ agents, onSent }: AgentMessageFormProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [selectedAll, setSelectedAll] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function toggleAgent(id: string) {
    setSelectedAll(false)
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch("/api/messages/notify-agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        agentIds: selectedAll ? [] : selectedIds,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setResult({ type: "success", text: `پیام برای ${data.data.recipientCount} مشاور ارسال شد` })
      setTitle("")
      setMessage("")
      onSent?.()
    } else {
      setResult({ type: "error", text: data.error ?? "خطایی رخ داد" })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <p className={`text-sm ${result.type === "success" ? "text-emerald-600" : "text-destructive"}`}>
          {result.text}
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">عنوان پیام *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان پیام اعلان"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">متن پیام *</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="متن پیامی که در اعلان مشاوران نمایش داده می‌شود..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-left">
          {message.length.toLocaleString("fa-IR")} / ۲۰۰۰
        </p>
      </div>

      {/* Agent selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">گیرندگان</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setSelectedAll(true); setSelectedIds([]) }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              selectedAll
                ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
            }`}
          >
            همه مشاوران
          </button>
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => toggleAgent(agent.id)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                !selectedAll && selectedIds.includes(agent.id)
                  ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
              }`}
            >
              {agent.displayName}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading || !title.trim() || !message.trim()}>
        {loading ? "در حال ارسال..." : "ارسال اعلان"}
      </Button>
    </form>
  )
}
