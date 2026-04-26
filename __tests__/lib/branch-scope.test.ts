import { describe, it, expect } from "vitest"
import {
  buildBranchFilter,
  resolveBranchScope,
  resolveUserBranchScope,
} from "@/lib/branch-scope"

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

describe("resolveBranchScope — query param overlay", () => {
  it("MANAGER + requested branchId narrows to the requested branch", () => {
    const result = resolveBranchScope(
      { role: "MANAGER", branchId: null },
      office(),
      "file",
      "branch-b"
    )
    expect(result).toEqual({ branchId: "branch-b" })
  })

  it("MANAGER without requested branchId returns empty filter (sees all)", () => {
    const result = resolveBranchScope(
      { role: "MANAGER", branchId: null },
      office(),
      "file",
      null
    )
    expect(result).toEqual({})
  })

  it("AGENT scoped to branch-a CANNOT override their visibility via requested branchId", () => {
    // Branch-scoped agent tries to view branch-b — request is ignored, they
    // remain pinned to branch-a by the visibility filter.
    const result = resolveBranchScope(
      agent("branch-a"),
      office(),
      "file",
      "branch-b"
    )
    expect(result).toEqual({ branchId: "branch-a" })
  })

  it("AGENT with viewAllBranches override + requested branchId narrows to it", () => {
    const result = resolveBranchScope(
      {
        role: "AGENT",
        officeMemberRole: "AGENT",
        branchId: "branch-a",
        permissionsOverride: { viewAllBranches: true },
      },
      office(),
      "file",
      "branch-b"
    )
    expect(result).toEqual({ branchId: "branch-b" })
  })

  it("Sharing ON + requested branchId narrows to the requested branch", () => {
    const result = resolveBranchScope(
      agent("branch-a"),
      office({ shareFilesAcrossBranches: true }),
      "file",
      "branch-b"
    )
    expect(result).toEqual({ branchId: "branch-b" })
  })

  it("multiBranch disabled + requested branchId still narrows (admin overlay)", () => {
    // When multi-branch is off, visibility is empty — but if a branchId is in
    // the URL we still honor it. (In practice the switcher would never inject
    // one in this state, but the helper shouldn't silently drop it.)
    const result = resolveBranchScope(
      agent("branch-a"),
      office({ multiBranchEnabled: false }),
      "file",
      "branch-b"
    )
    expect(result).toEqual({ branchId: "branch-b" })
  })

  it("Empty string requested branchId is treated as no filter", () => {
    const result = resolveBranchScope(
      { role: "MANAGER", branchId: null },
      office(),
      "file",
      ""
    )
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

describe("resolveUserBranchScope", () => {
  const userOffice = (multiBranchEnabled: boolean) => ({ multiBranchEnabled })

  it("returns empty when multi-branch is disabled (request ignored)", () => {
    const result = resolveUserBranchScope(
      { role: "MANAGER", branchId: null },
      userOffice(false),
      "branch-a"
    )
    expect(result).toEqual({})
  })

  it("MANAGER with no requested branch sees everyone", () => {
    const result = resolveUserBranchScope(
      { role: "MANAGER", branchId: null },
      userOffice(true)
    )
    expect(result).toEqual({})
  })

  it("MANAGER narrows when ?branchId is passed", () => {
    const result = resolveUserBranchScope(
      { role: "MANAGER", branchId: null },
      userOffice(true),
      "branch-x"
    )
    expect(result).toEqual({ branchId: "branch-x" })
  })

  it("non-manager with viewAllBranches narrows when ?branchId is passed", () => {
    const result = resolveUserBranchScope(
      {
        role: "AGENT",
        officeMemberRole: "ACCOUNTANT", // preset grants viewAllBranches
        branchId: null,
      },
      userOffice(true),
      "branch-y"
    )
    expect(result).toEqual({ branchId: "branch-y" })
  })

  it("non-manager with viewAllBranches sees everyone when no ?branchId", () => {
    const result = resolveUserBranchScope(
      {
        role: "AGENT",
        officeMemberRole: "ACCOUNTANT",
        branchId: null,
      },
      userOffice(true)
    )
    expect(result).toEqual({})
  })

  it("branch-scoped viewer is pinned to their own branch (request ignored)", () => {
    const result = resolveUserBranchScope(
      {
        role: "AGENT",
        officeMemberRole: "BRANCH_MANAGER",
        branchId: "branch-b",
      },
      userOffice(true),
      "branch-a" // attempt to widen — must be ignored
    )
    expect(result).toEqual({ branchId: "branch-b" })
  })

  it("branch-scoped viewer with no branchId falls through to no filter", () => {
    const result = resolveUserBranchScope(
      {
        role: "AGENT",
        officeMemberRole: "AGENT",
        branchId: null,
      },
      userOffice(true)
    )
    expect(result).toEqual({})
  })
})
