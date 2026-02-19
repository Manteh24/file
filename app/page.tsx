import { redirect } from "next/navigation"

// Root path redirects to login. The middleware handles auth-gating,
// but this provides an explicit fallback.
export default function RootPage() {
  redirect("/login")
}
