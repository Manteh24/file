import { RegisterForm } from "./RegisterForm"

interface RegisterPageProps {
  searchParams: Promise<{ ref?: string; identifier?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { ref, identifier } = await searchParams

  return <RegisterForm initialRef={ref} initialIdentifier={identifier} />
}
