"use client"
import { useState, useEffect, useRef, useCallback } from "react"

interface UsageData {
  activeFiles: number
  activeFilesMax: number
  users: number
  usersMax: number
  aiThisMonth: number
  aiMax: number
  smsThisMonth: number
  smsMax: number
}

interface PlanStatus {
  plan: string
  isTrial: boolean
  trialEndsAt: string | null
  usage: UsageData
}

type LimitField = "activeFiles" | "users" | "ai" | "sms"

function getPair(data: PlanStatus, field: LimitField): { current: number; max: number } {
  switch (field) {
    case "activeFiles":
      return { current: data.usage.activeFiles, max: data.usage.activeFilesMax }
    case "users":
      return { current: data.usage.users, max: data.usage.usersMax }
    case "ai":
      return { current: data.usage.aiThisMonth, max: data.usage.aiMax }
    case "sms":
      return { current: data.usage.smsThisMonth, max: data.usage.smsMax }
  }
}

export function usePlanStatus() {
  const [data, setData] = useState<PlanStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription/usage")
      if (!res.ok) return
      const json = await res.json() as { success: boolean; data?: PlanStatus }
      if (json.success && json.data) {
        setData(json.data)
      }
    } catch {
      // Silently ignore network errors — stale data is fine for UI hints
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Poll every 30 seconds to keep usage counts fresh
    intervalRef.current = setInterval(fetchData, 30_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchData])

  const isNearLimit = (field: LimitField) => {
    if (!data) return false
    const { current, max } = getPair(data, field)
    if (max === -1) return false
    return current / max >= 0.7
  }

  const isAtLimit = (field: LimitField) => {
    if (!data) return false
    const { current, max } = getPair(data, field)
    if (max === -1) return false
    return current >= max
  }

  return { data, isLoading, isNearLimit, isAtLimit }
}
