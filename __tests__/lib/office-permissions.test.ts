import { describe, it, expect } from "vitest"
import {
  canOfficeDo,
  resolveCapabilities,
  OFFICE_ROLE_CAPABILITIES,
  OFFICE_CAPABILITY_LABELS,
  type OfficeCapability,
  type OfficeMemberRole,
} from "@/lib/office-permissions"

const ALL_CAPABILITIES = Object.keys(OFFICE_CAPABILITY_LABELS) as OfficeCapability[]

describe("canOfficeDo — Manager & admin short-circuits", () => {
  it("MANAGER always returns true regardless of tier or override", () => {
    const user = { role: "MANAGER" as const }
    for (const cap of ALL_CAPABILITIES) {
      expect(canOfficeDo(user, cap)).toBe(true)
    }
  })

  it("MANAGER is allowed even when permissionsOverride says false", () => {
    const user = {
      role: "MANAGER" as const,
      permissionsOverride: { manageAgents: false, finalizeContract: false },
    }
    expect(canOfficeDo(user, "manageAgents")).toBe(true)
    expect(canOfficeDo(user, "finalizeContract")).toBe(true)
  })

  it("SUPER_ADMIN and MID_ADMIN are denied every capability (office APIs are not theirs)", () => {
    for (const role of ["SUPER_ADMIN", "MID_ADMIN"] as const) {
      for (const cap of ALL_CAPABILITIES) {
        expect(canOfficeDo({ role }, cap)).toBe(false)
      }
    }
  })
})

describe("canOfficeDo — AGENT preset fallback", () => {
  it("AGENT role + null officeMemberRole falls back to AGENT preset", () => {
    const user = { role: "AGENT" as const, officeMemberRole: null }
    expect(canOfficeDo(user, "createFile")).toBe(OFFICE_ROLE_CAPABILITIES.AGENT.createFile)
    expect(canOfficeDo(user, "editFile")).toBe(OFFICE_ROLE_CAPABILITIES.AGENT.editFile)
    expect(canOfficeDo(user, "manageAgents")).toBe(false)
    expect(canOfficeDo(user, "finalizeContract")).toBe(false)
  })

  it("AGENT role + undefined override uses the explicit preset map", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "AGENT" as const }
    expect(canOfficeDo(user, "createFile")).toBe(true)
    expect(canOfficeDo(user, "sendBulkSms")).toBe(false)
  })
})

describe("canOfficeDo — preset snapshots", () => {
  it("BRANCH_MANAGER grants scoped-owner powers, not manageOffice/manageBranches", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "BRANCH_MANAGER" as const }
    expect(canOfficeDo(user, "manageAgents")).toBe(true)
    expect(canOfficeDo(user, "finalizeContract")).toBe(true)
    expect(canOfficeDo(user, "viewReports")).toBe(true)
    expect(canOfficeDo(user, "viewFinancials")).toBe(true)
    expect(canOfficeDo(user, "manageOffice")).toBe(false)
    expect(canOfficeDo(user, "manageBranches")).toBe(false)
    expect(canOfficeDo(user, "viewAllBranches")).toBe(false)
  })

  it("ACCOUNTANT gets contracts/reports/financials but cannot edit files or agents", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "ACCOUNTANT" as const }
    expect(canOfficeDo(user, "viewContracts")).toBe(true)
    expect(canOfficeDo(user, "viewReports")).toBe(true)
    expect(canOfficeDo(user, "viewFinancials")).toBe(true)
    expect(canOfficeDo(user, "viewAllBranches")).toBe(true)
    expect(canOfficeDo(user, "editFile")).toBe(false)
    expect(canOfficeDo(user, "manageAgents")).toBe(false)
    expect(canOfficeDo(user, "sendSms")).toBe(false)
  })

  it("RECEPTIONIST can manage customers and send SMS, nothing financial", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "RECEPTIONIST" as const }
    expect(canOfficeDo(user, "manageCustomers")).toBe(true)
    expect(canOfficeDo(user, "sendSms")).toBe(true)
    expect(canOfficeDo(user, "viewContracts")).toBe(false)
    expect(canOfficeDo(user, "viewFinancials")).toBe(false)
    expect(canOfficeDo(user, "finalizeContract")).toBe(false)
    expect(canOfficeDo(user, "createFile")).toBe(false)
  })

  it("MARKETING gets file create/edit + bulk SMS, no finance or contracts", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "MARKETING" as const }
    expect(canOfficeDo(user, "createFile")).toBe(true)
    expect(canOfficeDo(user, "editFile")).toBe(true)
    expect(canOfficeDo(user, "sendBulkSms")).toBe(true)
    expect(canOfficeDo(user, "viewContracts")).toBe(false)
    expect(canOfficeDo(user, "viewFinancials")).toBe(false)
    expect(canOfficeDo(user, "finalizeContract")).toBe(false)
  })

  it("CUSTOM preset denies everything by default — overrides are the only grant path", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "CUSTOM" as const }
    for (const cap of ALL_CAPABILITIES) {
      expect(canOfficeDo(user, cap)).toBe(false)
    }
  })
})

describe("canOfficeDo — permissionsOverride wins over preset", () => {
  it("override true grants a capability the preset denied", () => {
    const user = {
      role: "AGENT" as const,
      officeMemberRole: "AGENT" as const,
      permissionsOverride: { finalizeContract: true },
    }
    expect(canOfficeDo(user, "finalizeContract")).toBe(true)
    // Unrelated capabilities still read from the AGENT preset
    expect(canOfficeDo(user, "createFile")).toBe(true)
    expect(canOfficeDo(user, "manageAgents")).toBe(false)
  })

  it("override false revokes a capability the preset granted", () => {
    const user = {
      role: "AGENT" as const,
      officeMemberRole: "AGENT" as const,
      permissionsOverride: { createFile: false },
    }
    expect(canOfficeDo(user, "createFile")).toBe(false)
    // Other preset grants still apply
    expect(canOfficeDo(user, "editFile")).toBe(true)
    expect(canOfficeDo(user, "sendSms")).toBe(true)
  })

  it("CUSTOM preset + targeted overrides produces exactly the granted set", () => {
    const user = {
      role: "AGENT" as const,
      officeMemberRole: "CUSTOM" as const,
      permissionsOverride: { viewReports: true, viewFinancials: true },
    }
    expect(canOfficeDo(user, "viewReports")).toBe(true)
    expect(canOfficeDo(user, "viewFinancials")).toBe(true)
    expect(canOfficeDo(user, "createFile")).toBe(false)
    expect(canOfficeDo(user, "manageAgents")).toBe(false)
  })

  it("override with a non-boolean (null/undefined) falls through to preset", () => {
    // Only `true` grants. `false` revokes. Keys explicitly present with undefined
    // also revoke (capability in override && value !== true).
    const user = {
      role: "AGENT" as const,
      officeMemberRole: "AGENT" as const,
      permissionsOverride: { createFile: undefined } as Record<string, boolean | undefined>,
    }
    // `createFile` is present with undefined — treated as not-true → false
    expect(canOfficeDo(user, "createFile")).toBe(false)
    // Capabilities not present in the override fall to preset
    expect(canOfficeDo(user, "editFile")).toBe(true)
  })
})

describe("resolveCapabilities", () => {
  it("returns every defined capability key", () => {
    const user = { role: "AGENT" as const, officeMemberRole: "AGENT" as const }
    const resolved = resolveCapabilities(user)
    expect(Object.keys(resolved).sort()).toEqual([...ALL_CAPABILITIES].sort())
  })

  it("mirrors canOfficeDo for each capability", () => {
    const presets: OfficeMemberRole[] = [
      "AGENT",
      "BRANCH_MANAGER",
      "ACCOUNTANT",
      "RECEPTIONIST",
      "MARKETING",
      "CUSTOM",
    ]
    for (const preset of presets) {
      const user = { role: "AGENT" as const, officeMemberRole: preset }
      const resolved = resolveCapabilities(user)
      for (const cap of ALL_CAPABILITIES) {
        expect(resolved[cap]).toBe(canOfficeDo(user, cap))
      }
    }
  })
})
