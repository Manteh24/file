import type { Role } from "@/types"

// ─── Office Member Roles & Capabilities ────────────────────────────────────────
// Mirrors the admin tier system in lib/admin.ts. Manager always gets everything;
// other office users are gated by a capability map per preset role, with an
// optional per-user override object that wins over the preset.

export type OfficeMemberRole =
  | "AGENT"
  | "BRANCH_MANAGER"
  | "ACCOUNTANT"
  | "RECEPTIONIST"
  | "MARKETING"
  | "CUSTOM"

export type OfficeCapability =
  | "manageAgents"
  | "manageBranches"
  | "createFile"
  | "editFile"
  | "deleteFile"
  | "assignFile"
  | "finalizeContract"
  | "viewContracts"
  | "viewReports"
  | "viewFinancials"
  | "manageCustomers"
  | "sendSms"
  | "sendBulkSms"
  | "manageOffice"
  | "viewActivityLog"
  | "viewAllBranches"

// Human-readable Persian labels for preset roles — used in UI selects.
export const OFFICE_ROLE_LABELS: Record<OfficeMemberRole, string> = {
  AGENT: "مشاور",
  BRANCH_MANAGER: "مدیر شعبه",
  ACCOUNTANT: "حسابدار",
  RECEPTIONIST: "پذیرش",
  MARKETING: "بازاریابی",
  CUSTOM: "سفارشی",
}

// Persian labels for capabilities — used in the per-user permission panel.
export const OFFICE_CAPABILITY_LABELS: Record<OfficeCapability, string> = {
  manageAgents: "مدیریت کاربران",
  manageBranches: "مدیریت شعبه‌ها",
  createFile: "ایجاد فایل",
  editFile: "ویرایش فایل",
  deleteFile: "حذف فایل",
  assignFile: "انتساب فایل به مشاور",
  finalizeContract: "نهایی‌سازی قرارداد",
  viewContracts: "مشاهده قراردادها",
  viewReports: "مشاهده گزارش‌ها",
  viewFinancials: "مشاهده اطلاعات مالی",
  manageCustomers: "مدیریت مشتریان",
  sendSms: "ارسال پیامک",
  sendBulkSms: "ارسال پیامک گروهی",
  manageOffice: "تنظیمات دفتر",
  viewActivityLog: "مشاهده گزارش فعالیت",
  viewAllBranches: "دسترسی به تمام شعبه‌ها",
}

// Preset capability bundles. CUSTOM starts from all-false — any grant comes
// from permissionsOverride. BRANCH_MANAGER intentionally lacks manageBranches,
// manageOffice and viewAllBranches: they mirror the owner but scoped to their
// own branch; the branch-scope filter handles the scoping.
export const OFFICE_ROLE_CAPABILITIES: Record<
  OfficeMemberRole,
  Record<OfficeCapability, boolean>
> = {
  AGENT: {
    manageAgents: false,
    manageBranches: false,
    createFile: true,
    editFile: true,
    deleteFile: false,
    assignFile: false,
    finalizeContract: false,
    viewContracts: false,
    viewReports: false,
    viewFinancials: false,
    manageCustomers: true,
    sendSms: true,
    sendBulkSms: false,
    manageOffice: false,
    viewActivityLog: false,
    viewAllBranches: false,
  },
  BRANCH_MANAGER: {
    manageAgents: true,
    manageBranches: false,
    createFile: true,
    editFile: true,
    deleteFile: true,
    assignFile: true,
    finalizeContract: true,
    viewContracts: true,
    viewReports: true,
    viewFinancials: true,
    manageCustomers: true,
    sendSms: true,
    sendBulkSms: true,
    manageOffice: false,
    viewActivityLog: true,
    viewAllBranches: false,
  },
  ACCOUNTANT: {
    manageAgents: false,
    manageBranches: false,
    createFile: false,
    editFile: false,
    deleteFile: false,
    assignFile: false,
    finalizeContract: false,
    viewContracts: true,
    viewReports: true,
    viewFinancials: true,
    manageCustomers: false,
    sendSms: false,
    sendBulkSms: false,
    manageOffice: false,
    viewActivityLog: true,
    viewAllBranches: true,
  },
  RECEPTIONIST: {
    manageAgents: false,
    manageBranches: false,
    createFile: false,
    editFile: false,
    deleteFile: false,
    assignFile: false,
    finalizeContract: false,
    viewContracts: false,
    viewReports: false,
    viewFinancials: false,
    manageCustomers: true,
    sendSms: true,
    sendBulkSms: false,
    manageOffice: false,
    viewActivityLog: false,
    viewAllBranches: false,
  },
  MARKETING: {
    manageAgents: false,
    manageBranches: false,
    createFile: true,
    editFile: true,
    deleteFile: false,
    assignFile: false,
    finalizeContract: false,
    viewContracts: false,
    viewReports: false,
    viewFinancials: false,
    manageCustomers: true,
    sendSms: true,
    sendBulkSms: true,
    manageOffice: false,
    viewActivityLog: false,
    viewAllBranches: false,
  },
  CUSTOM: {
    manageAgents: false,
    manageBranches: false,
    createFile: false,
    editFile: false,
    deleteFile: false,
    assignFile: false,
    finalizeContract: false,
    viewContracts: false,
    viewReports: false,
    viewFinancials: false,
    manageCustomers: false,
    sendSms: false,
    sendBulkSms: false,
    manageOffice: false,
    viewActivityLog: false,
    viewAllBranches: false,
  },
}

// Sparse override stored on the user — any key present wins over the preset.
export type PermissionsOverride = Partial<Record<OfficeCapability, boolean>>

interface OfficePermissionInput {
  role: Role
  officeMemberRole?: OfficeMemberRole | null
  permissionsOverride?: PermissionsOverride | null
}

/**
 * Returns whether an office user may perform a given capability.
 *
 * Resolution order:
 *   1. MANAGER role → always allowed (the office owner).
 *   2. SUPER_ADMIN / MID_ADMIN → always denied (they don't run office APIs).
 *   3. For AGENT role:
 *      a. permissionsOverride[capability] wins when set (true or false).
 *      b. Otherwise, fall back to the preset capability map keyed by
 *         officeMemberRole (defaulting to AGENT for null — legacy agents).
 */
export function canOfficeDo(
  user: OfficePermissionInput,
  capability: OfficeCapability
): boolean {
  if (user.role === "MANAGER") return true
  if (user.role !== "AGENT") return false

  const override = user.permissionsOverride
  if (override && capability in override) {
    return override[capability] === true
  }

  const preset: OfficeMemberRole = user.officeMemberRole ?? "AGENT"
  return OFFICE_ROLE_CAPABILITIES[preset][capability] ?? false
}

/**
 * Returns the resolved capability set for an office user as a plain object.
 * Useful for bulk UI rendering (e.g. permission matrix).
 */
export function resolveCapabilities(
  user: OfficePermissionInput
): Record<OfficeCapability, boolean> {
  const allCapabilities = Object.keys(OFFICE_CAPABILITY_LABELS) as OfficeCapability[]
  const resolved = {} as Record<OfficeCapability, boolean>
  for (const cap of allCapabilities) {
    resolved[cap] = canOfficeDo(user, cap)
  }
  return resolved
}
