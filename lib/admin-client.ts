// Client-safe admin capability constants and types — no Node.js / Prisma imports.
// Import from here in "use client" components instead of from lib/admin.

export type AdminCapability = "manageSubscriptions" | "manageUsers" | "securityActions" | "broadcast"

export const ADMIN_CAPABILITIES: AdminCapability[] = [
  "manageSubscriptions",
  "manageUsers",
  "securityActions",
  "broadcast",
]

export const ADMIN_CAPABILITY_LABELS: Record<AdminCapability, string> = {
  manageSubscriptions: "مدیریت اشتراک (تمدید آزمایشی، تغییر پلن، تعلیق)",
  manageUsers:         "مدیریت کاربران (فعال/غیرفعال‌سازی)",
  securityActions:     "اقدامات امنیتی (خروج اجباری، بازنشانی رمز)",
  broadcast:           "ارسال پیام همگانی",
}

export type AdminPermissionsOverride = Partial<Record<AdminCapability, boolean>>
