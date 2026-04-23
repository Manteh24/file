"use client"

import { useEffect } from "react"
import { WelcomeModal } from "@/components/settings/WelcomeModal"
import type { Plan } from "@/types"

interface PlanUpgradeCelebrationProps {
  notificationId: string
  plan: Plan
}

/**
 * Shown on the dashboard when the manager has an unread PLAN_UPGRADED notification
 * (i.e. the plan was activated by an admin rather than via self-service payment).
 * Immediately marks the notification as read so the modal only shows once.
 */
export function PlanUpgradeCelebration({
  notificationId,
  plan,
}: PlanUpgradeCelebrationProps) {
  useEffect(() => {
    // Fire-and-forget: mark notification read so this modal doesn't reappear
    fetch(`/api/notifications/${notificationId}`, { method: "PATCH" }).catch(
      () => null
    )
  }, [notificationId])

  return <WelcomeModal open plan={plan} />
}
