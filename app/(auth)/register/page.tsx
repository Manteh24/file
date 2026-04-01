import { RegisterForm } from "./RegisterForm"

interface RegisterPageProps {
  searchParams: Promise<{ ref?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { ref } = await searchParams

  return <RegisterForm initialRef={ref} />
}
