import { z } from "zod"

export const createTicketSchema = z.object({
  subject: z.string().min(5, "موضوع حداقل ۵ کاراکتر").max(120),
  message: z.string().min(10, "پیام حداقل ۱۰ کاراکتر").max(4000),
  category: z.enum(["BILLING", "TECHNICAL", "ACCOUNT", "FEATURE_REQUEST", "BUG_REPORT", "OTHER"]),
})

export const addMessageSchema = z.object({
  body: z.string().min(1).max(4000),
})

export const updateTicketStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "RESOLVED"]),
})
