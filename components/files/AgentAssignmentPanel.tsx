"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OfficeAgent {
  id: string
  displayName: string
  isActive: boolean
}

interface AssignedAgent {
  id: string
  userId: string
  user: { id: string; displayName: string }
}

interface AgentAssignmentPanelProps {
  fileId: string
  currentAgents: AssignedAgent[]
}

export function AgentAssignmentPanel({ fileId, currentAgents }: AgentAssignmentPanelProps) {
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  // All active office agents — loaded on first edit open
  const [allAgents, setAllAgents] = useState<OfficeAgent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  // Currently selected agent IDs in the edit form
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openEdit() {
    setSelected(new Set(currentAgents.map((a) => a.userId)))
    setError(null)
    setEditing(true)

    // Only fetch once — cache in state for subsequent opens
    if (allAgents.length === 0) {
      setLoadingAgents(true)
      try {
        const res = await fetch("/api/agents")
        const body = await res.json()
        if (body.success) {
          setAllAgents((body.data as OfficeAgent[]).filter((a) => a.isActive))
        } else {
          setError("خطا در دریافت لیست مشاوران")
        }
      } catch {
        setError("خطا در دریافت لیست مشاوران")
      } finally {
        setLoadingAgents(false)
      }
    }
  }

  function toggleAgent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/files/${fileId}/agents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentIds: Array.from(selected) }),
      })
      const body = await res.json()
      if (!body.success) {
        setError(body.error ?? "خطا در ذخیره‌سازی")
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">مشاوران تخصیص‌داده‌شده</CardTitle>
        {!editing && (
          <Button size="sm" variant="outline" onClick={openEdit}>
            ویرایش تخصیص
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!editing ? (
          currentAgents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {currentAgents.map((a) => (
                <span key={a.id} className="rounded-full bg-accent px-3 py-1 text-sm">
                  {a.user.displayName}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">هیچ مشاوری تخصیص نیافته</p>
          )
        ) : (
          <div className="space-y-3">
            {loadingAgents ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : allAgents.length === 0 && !error ? (
              <p className="py-2 text-sm text-muted-foreground">
                مشاور فعالی در دفتر وجود ندارد
              </p>
            ) : (
              <div className="space-y-1">
                {allAgents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm">{agent.displayName}</span>
                  </label>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} disabled={saving || loadingAgents}>
                {saving && <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />}
                ذخیره
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                انصراف
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
