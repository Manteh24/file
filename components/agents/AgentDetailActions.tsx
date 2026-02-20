"use client"

import dynamic from "next/dynamic"

// ssr: false must be declared inside a Client Component (not a Server Component).
// These components use Radix UI AlertDialog and React Hook Form, both of which
// call useId() internally. Skipping SSR avoids the server/client ID mismatch.
const DeactivateAgentButton = dynamic(
  () => import("./DeactivateAgentButton").then((m) => ({ default: m.DeactivateAgentButton })),
  { ssr: false }
)

const ResetPasswordForm = dynamic(
  () => import("./ResetPasswordForm").then((m) => ({ default: m.ResetPasswordForm })),
  { ssr: false }
)

export { DeactivateAgentButton, ResetPasswordForm }
