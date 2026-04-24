import { describe, it, expect } from "vitest"
import { buildBranchFilter } from "@/lib/branch-scope"

// Shorthand constructors so each case reads as close to the rule matrix as possible.
const office = (flags: Partial<{
  multiBranchEnabled: boolean
  shareFilesAcrossBranches: boolean
  shareCustomersAcrossBranches: boolean
}> = {}) => ({
  multiBranchEnabled: true,
  shareFilesAcrossBranches: false,
  shareCustomersAcrossBranches: false,
  ...flags,
})

const agent = (branchId: string | null) => ({
  role: "AGENT" as const,
  officeMemberRole: "AGENT" as const,
  branchId,
})

describe("buildBranchFilter — multi-branch disabled", () => {
  it("returns empty filter when office has not enabled branches (files)", () => {
    const result = buildBranchFilter(
      agent("branch-a"),
      office({ multiBranchEnabled: false }),
      "file"
    )
    expect(result).toEqual({})
  })

  it("returns empty filter when office has not enabled branches (customers)", () => {
    const result = buildBranchFilter(
      agent("branch-a"),
      office({ multiBranchEnabled: false }),
      "customer"
    )
    expect(result).toEqual({})
  })
})

describe("buildBranchFilter — MANAGER short-circuit", () => {
  it("MANAGER always sees everything, even with isolation on", () => {
    const result = buildBranchFilter(
      { role: "MANAGER", branchId: null },
      office(),
      "file"
    )
    expect(result).toEqual({})
  })

  it("MANAGER with a branchId still sees everything", () => {
    const result = buildBranchFilter(
      { role: "MANAGER", branchId: "branch-a" },
      office(),
      "customer"
    )
    expect(result).toEqual({})
  })
})

describe("buildBranchFilter — viewAllBranches capability short-circuit", () => {
  it("AGENT with permissionsOverride.viewAllBranches=true bypasses isolation", () => {
    const result = buildBranchFilter(
      {
        role: "AGENT",
        officeMemberRole: "AGENT",
        branchId: "branch-a",
        permissionsOverride: { viewAllBranches: true },
      },
      office(),
      "file"
    )
    expect(result).toEqual({})
  })

  it("ACCOUNTANT preset (which grants viewAllBranches) bypasses isolation", () => {
    const result = buildBranchFilter(
      {
        role: "AGENT",
        officeMemberRole: "ACCOUNTANT",
        branchId: "branch-a",
      },
      office(),
      "file"
    )
    expect(result).toEqual({})
  })
})

describe("buildBranchFilter — sharing toggle", () => {
  it("shareFilesAcrossBranches=true gives empty filter for file entity", () => {
    const result = buildBranchFilter(
      agent("branch-a"),
      office({ shareFilesAcrossBranches: true }),
      "file"
    )
    expect(result).toEqual({})
  })

  it("shareCustomersAcrossBranches=true gives empty filter for customer entity", () => {
    const result = buildBranchFilter(
      agent("branch-a"),
      office({ shareCustomersAcrossBranches: true }),
      "customer"
    )
    expect(result).toEqual({})
  })

  it("file-sharing ON does not open up customers when customer sharing is OFF", () => {
    const result = buildBranchFilter(
      agent("branch-a"),
      office({
        shareFilesAcrossBranches: true,
        shareCustomersAcrossBranches: false,
      }),
      "customer"
    )
    expect(result).toEqual({ branchId: "branch-a" })
  })
})

describe("buildBranchFilter — isolation on", () => {
  it("AGENT in branch-a with isolation sees only their branch's files", () => {
    const result = buildBranchFilter(agent("branch-a"), office(), "file")
    expect(result).toEqual({ branchId: "branch-a" })
  })

  it("AGENT in branch-a with isolation sees only their branch's customers", () => {
    const result = buildBranchFilter(agent("branch-a"), office(), "customer")
    expect(result).toEqual({ branchId: "branch-a" })
  })

  it("AGENT with no branchId (office-wide) sees everything — no filter pinned", () => {
    const result = buildBranchFilter(agent(null), office(), "file")
    expect(result).toEqual({})
  })
})

describe("buildBranchFilter — full matrix smoke", () => {
  // The 8 core combinations (multiBranchEnabled × sharing × has branchId)
  // for an AGENT without viewAllBranches. This is the coverage the plan calls for.
  const cases: Array<{
    name: string
    multi: boolean
    share: boolean
    branchId: string | null
    expected: Record<string, unknown>
  }> = [
    { name: "disabled, share on, with branchId", multi: false, share: true, branchId: "b1", expected: {} },
    { name: "disabled, share on, no branchId", multi: false, share: true, branchId: null, expected: {} },
    { name: "disabled, share off, with branchId", multi: false, share: false, branchId: "b1", expected: {} },
    { name: "disabled, share off, no branchId", multi: false, share: false, branchId: null, expected: {} },
    { name: "enabled, share on, with branchId", multi: true, share: true, branchId: "b1", expected: {} },
    { name: "enabled, share on, no branchId", multi: true, share: true, branchId: null, expected: {} },
    { name: "enabled, share off, with branchId", multi: true, share: false, branchId: "b1", expected: { branchId: "b1" } },
    { name: "enabled, share off, no branchId", multi: true, share: false, branchId: null, expected: {} },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const result = buildBranchFilter(
        agent(c.branchId),
        office({
          multiBranchEnabled: c.multi,
          shareFilesAcrossBranches: c.share,
        }),
        "file"
      )
      expect(result).toEqual(c.expected)
    })
  }
})
