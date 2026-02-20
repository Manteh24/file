import type { DefaultSession } from "next-auth"

// ─── Domain Enums ─────────────────────────────────────────────────────────────
// String unions mirror the Prisma enums — used in TypeScript without importing
// from the generated Prisma client.

export type Role = "SUPER_ADMIN" | "MID_ADMIN" | "MANAGER" | "AGENT"
export type CustomerType = "BUYER" | "RENTER" | "SELLER" | "LANDLORD"
export type Plan = "TRIAL" | "SMALL" | "LARGE"
export type SubStatus = "ACTIVE" | "GRACE" | "LOCKED" | "CANCELLED"

export type TransactionType = "SALE" | "LONG_TERM_RENT" | "SHORT_TERM_RENT" | "PRE_SALE"
export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "LAND"
  | "COMMERCIAL"
  | "OFFICE"
  | "OTHER"
export type FileStatus = "ACTIVE" | "ARCHIVED" | "SOLD" | "RENTED" | "EXPIRED"
export type ContactType = "OWNER" | "TENANT" | "LANDLORD" | "BUYER"

// ─── File Domain Types ─────────────────────────────────────────────────────────

export interface FileContact {
  id: string
  fileId: string
  type: ContactType
  name: string | null
  phone: string
  notes: string | null
  createdAt: Date
}

export interface FilePhoto {
  id: string
  fileId: string
  url: string
  order: number
  createdAt: Date
}

export interface ActivityLogEntry {
  id: string
  fileId: string
  userId: string
  action: string
  diff: Record<string, (string | number | boolean | null)[]> | null
  createdAt: Date
  user: { displayName: string; role: Role }
}

export interface PriceHistoryEntry {
  id: string
  fileId: string
  priceField: string
  oldPrice: number | null
  newPrice: number | null
  changedAt: Date
  changedBy: { displayName: string }
}

export interface AssignedAgent {
  id: string
  userId: string
  assignedAt: Date
  user: { id: string; displayName: string }
}

// Full file detail returned by GET /api/files/[id]
export interface PropertyFileDetail {
  id: string
  officeId: string
  createdById: string
  transactionType: TransactionType
  status: FileStatus
  propertyType: PropertyType | null
  area: number | null
  floorNumber: number | null
  totalFloors: number | null
  buildingAge: number | null
  salePrice: number | null
  depositAmount: number | null
  rentAmount: number | null
  latitude: number | null
  longitude: number | null
  address: string | null
  neighborhood: string | null
  locationAnalysis: unknown
  description: string | null
  hasElevator: boolean
  hasParking: boolean
  hasStorage: boolean
  hasBalcony: boolean
  hasSecurity: boolean
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { displayName: string }
  contacts: FileContact[]
  photos: FilePhoto[]
  assignedAgents: AssignedAgent[]
  activityLogs: ActivityLogEntry[]
  priceHistory: PriceHistoryEntry[]
}

// Summary card used in the file list
export interface PropertyFileSummary {
  id: string
  transactionType: TransactionType
  status: FileStatus
  propertyType: PropertyType | null
  area: number | null
  address: string | null
  neighborhood: string | null
  salePrice: number | null
  depositAmount: number | null
  rentAmount: number | null
  createdAt: Date
  updatedAt: Date
  createdBy: { displayName: string }
  contacts: Pick<FileContact, "id" | "name" | "phone" | "type">[]
  assignedAgents: { user: { displayName: string } }[]
  _count: { photos: number; shareLinks: number }
}

// ─── Agent Domain Types ────────────────────────────────────────────────────────

export interface AgentSummary {
  id: string
  username: string
  displayName: string
  email: string | null
  isActive: boolean
  createdAt: Date
  _count: { fileAssignments: number }
}

export interface AgentDetail extends AgentSummary {
  officeId: string
  updatedAt: Date
  fileAssignments: Array<{
    file: { id: string; transactionType: string; status: string }
  }>
}

// ─── CRM Domain Types ──────────────────────────────────────────────────────────

export interface CustomerNote {
  id: string
  customerId: string
  content: string
  createdAt: Date
  user: { displayName: string }
}

// Summary card used in the customer list
export interface CustomerSummary {
  id: string
  name: string
  phone: string
  type: CustomerType
  createdAt: Date
  _count: { contactLogs: number }
}

// Full customer detail returned by GET /api/crm/[id]
export interface CustomerDetail {
  id: string
  officeId: string
  name: string
  phone: string
  email: string | null
  type: CustomerType
  notes: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { displayName: string }
  contactLogs: CustomerNote[]
}

// ─── NextAuth Type Augmentation ───────────────────────────────────────────────
// Extends the built-in NextAuth types to include our custom session fields.
// These fields are embedded in the JWT and exposed on session.user.

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      officeId: string
      role: Role
      sessionId: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    officeId: string
    role: Role
    sessionId: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string
    officeId: string
    role: Role
    sessionId: string
  }
}

// ─── API Response Shapes ──────────────────────────────────────────────────────
// All API routes and server actions return one of these two shapes.

export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
