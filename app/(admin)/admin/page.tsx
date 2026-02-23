import { redirect } from "next/navigation"

// /admin → redirect to the dashboard
export default function AdminRoot() {
  redirect("/admin/dashboard")
}
