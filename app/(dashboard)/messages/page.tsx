"use client"

import { useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { MessageSquare, Phone, History, Lock } from "lucide-react"
import { AgentMessageForm } from "@/components/messages/AgentMessageForm"
import { CustomerSmsForm } from "@/components/messages/CustomerSmsForm"
import { MessageHistoryList } from "@/components/messages/MessageHistoryList"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared/PageHeader"
import { PlanLockCard } from "@/components/shared/PlanLockCard"
import { canOfficeDo, type OfficeMemberRole, type PermissionsOverride } from "@/lib/office-permissions"
import type { Role } from "@/types"

interface Agent {
  id: string
  displayName: string
}

const TABS = [
  { id: "notify", label: "پیام به مشاوران", icon: MessageSquare },
  { id: "sms", label: "پیامک انبوه", icon: Phone },
] as const

type TabId = typeof TABS[number]["id"]

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notify")
  const [agents, setAgents] = useState<Agent[]>([])
  const [sessionUser, setSessionUser] = useState<{
    role: Role
    officeMemberRole?: OfficeMemberRole | null
    permissionsOverride?: PermissionsOverride | null
  } | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    // Fetch session user to guard page client-side via canOfficeDo
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.role) {
          setSessionUser({
            role: s.user.role,
            officeMemberRole: s.user.officeMemberRole ?? null,
            permissionsOverride: s.user.permissionsOverride ?? null,
          })
        }
      })

    // Fetch subscription plan for SMS gating
    fetch("/api/subscription/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.plan) setPlan(d.data.plan)
      })
      .catch(() => {})

    // Fetch agents for notification form
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setAgents(d.data.map((a: { id: string; displayName: string }) => ({ id: a.id, displayName: a.displayName })))
        }
      })
  }, [])

  if (sessionUser && !canOfficeDo(sessionUser, "sendBulkSms")) {
    redirect("/dashboard")
  }

  function handleSent() {
    setHistoryKey((k) => k + 1)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title="مرکز پیام"
        description="ارسال اعلان به مشاوران و پیام‌رسانی به مشتریان"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border p-1 bg-muted/40">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background shadow-sm text-[var(--color-teal-700)] dark:text-[var(--color-teal-400)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border p-5">
        {activeTab === "notify" && (
          <AgentMessageForm agents={agents} onSent={handleSent} />
        )}
        {activeTab === "sms" && (
          plan === "TEAM" ? (
            <CustomerSmsForm onSent={handleSent} />
          ) : (
            <PlanLockCard
              feature="hasBulkSms"
              requiredPlan="TEAM"
              title="پیامک انبوه"
              icon={Lock}
              bullets={[
                "ارسال به همه مشتریان با یک تپ",
                "فیلتر بر اساس وضعیت و علاقه‌مندی",
                "پیش‌نمایش تعداد و متن قبل از ارسال",
              ]}
            />
          )
        )}
      </div>

      <Separator />

      {/* Message history */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <History className="h-4 w-4 text-muted-foreground" />
          تاریخچه پیام‌ها
        </h2>
        <MessageHistoryList refreshKey={historyKey} />
      </div>
    </div>
  )
}
