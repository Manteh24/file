"use client"

import { useState } from "react"
import { format } from "date-fns-jalali"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminUserSummary, Role } from "@/types"

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "مدیر",
  AGENT: "مشاور",
}

const ROLE_CLASSES: Record<string, string> = {
  MANAGER: "bg-blue-100 text-blue-700",
  AGENT: "bg-muted text-muted-foreground",
}

interface UserTableProps {
  users: AdminUserSummary[]
}

export function UserTable({ users }: UserTableProps) {
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [localActive, setLocalActive] = useState<Record<string, boolean>>({})

  const filtered = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.office?.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function toggleActive(user: AdminUserSummary) {
    const newActive = !(localActive[user.id] ?? user.isActive)
    setLoadingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      })
      if (res.ok) {
        setLocalActive((prev) => ({ ...prev, [user.id]: newActive }))
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام، نام کاربری یا دفتر..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2 pe-9 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">کاربری یافت نشد</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نام</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نام کاربری</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نقش</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">دفتر</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">تاریخ ثبت</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => {
                const isActive = localActive[user.id] ?? user.isActive
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{user.displayName}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                        ROLE_CLASSES[user.role] ?? "bg-muted text-muted-foreground"
                      )}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.office?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {format(new Date(user.createdAt), "yyyy/MM/dd")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={loadingId === user.id}
                        className={cn(
                          "text-[11px] font-medium rounded-full px-2.5 py-0.5 transition-colors",
                          isActive
                            ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                            : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700",
                          loadingId === user.id && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isActive ? "فعال" : "غیرفعال"}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
