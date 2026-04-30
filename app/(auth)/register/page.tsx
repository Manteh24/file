import { RegisterForm } from "./RegisterForm"

interface RegisterPageProps {
  searchParams: Promise<{ ref?: string; identifier?: string; intent?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { ref, identifier, intent } = await searchParams

  return (
    <RegisterForm
      initialRef={ref}
      initialIdentifier={identifier}
      initialIntent={intent}
    />
  )
}
