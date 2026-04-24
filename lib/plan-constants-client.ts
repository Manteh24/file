// Client-safe plan constants — no Node.js imports.
// Import from here in "use client" components instead of from lib/subscription.

export const PLAN_LIMITS = {
  FREE: { maxUsers: 1, maxActiveFiles: 10, maxAiPerMonth: 10, maxSmsPerMonth: 30 },
  PRO:  { maxUsers: 10, maxActiveFiles: Infinity, maxAiPerMonth: Infinity, maxSmsPerMonth: Infinity },
  TEAM: { maxUsers: Infinity, maxActiveFiles: Infinity, maxAiPerMonth: Infinity, maxSmsPerMonth: Infinity },
} as const

export const PLAN_FEATURES = {
  FREE: {
    hasShareSms: true,
    hasBulkSms: false,
    hasMaps: true,
    hasMapEnrichment: false,
    hasReports: false,
    hasPdfExport: false,
    hasLinkTracking: false,
    hasCustomBranding: false,
    hasAdvancedAnalytics: false,
    hasMultiBranch: false,
    hasCustomStaffRoles: false,
    watermarkLinks: true,
  },
  PRO: {
    hasShareSms: true,
    hasBulkSms: true,
    hasMaps: true,
    hasMapEnrichment: true,
    hasReports: true,
    hasPdfExport: true,
    hasLinkTracking: true,
    hasCustomBranding: true,
    hasAdvancedAnalytics: false,
    hasMultiBranch: false,
    hasCustomStaffRoles: false,
    watermarkLinks: false,
  },
  TEAM: {
    hasShareSms: true,
    hasBulkSms: true,
    hasMaps: true,
    hasMapEnrichment: true,
    hasReports: true,
    hasPdfExport: true,
    hasLinkTracking: true,
    hasCustomBranding: true,
    hasAdvancedAnalytics: true,
    hasMultiBranch: true,
    hasCustomStaffRoles: true,
    watermarkLinks: false,
  },
} as const
