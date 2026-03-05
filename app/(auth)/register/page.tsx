import { RegisterForm } from "./RegisterForm"
import type { Plan } from "@/types"

interface RegisterPageProps {
  searchParams: Promise<{ plan?: string }>
}

const VALID_PLANS: Plan[] = ["FREE", "PRO", "TEAM"]

function parsePlan(raw: string | undefined): Plan {
  const normalized = raw?.toUpperCase() as Plan | undefined
  if (normalized && VALID_PLANS.includes(normalized)) return normalized
  return "PRO"
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { plan: planParam } = await searchParams
  const initialPlan = parsePlan(planParam)

  return <RegisterForm initialPlan={initialPlan} />
}
