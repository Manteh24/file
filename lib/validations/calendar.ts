import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const createCalendarEventSchema = z
  .object({
    title: z.string().max(200).optional().or(z.literal("")),
    type: z.enum(["REMINDER", "NOTE", "MEETING"]),
    eventDate: z.string().min(1, "تاریخ الزامی است"),
    startTime: z
      .string()
      .regex(timeRegex, "فرمت ساعت نامعتبر است")
      .optional()
      .or(z.literal("")),
    endTime: z
      .string()
      .regex(timeRegex, "فرمت ساعت نامعتبر است")
      .optional()
      .or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    attendeeIds: z.array(z.string()).optional(),
    reminderMinutes: z.number().int().min(1).max(44640).optional(),
    playSound: z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (!d.startTime || !d.endTime || d.startTime === "" || d.endTime === "") return true
      return d.endTime > d.startTime
    },
    { message: "ساعت پایان باید بعد از ساعت شروع باشد", path: ["endTime"] }
  )

export const updateCalendarEventSchema = z
  .object({
    title: z.string().max(200).optional().or(z.literal("")),
    type: z.enum(["REMINDER", "NOTE", "MEETING"]).optional(),
    eventDate: z.string().min(1).optional(),
    startTime: z
      .string()
      .regex(timeRegex, "فرمت ساعت نامعتبر است")
      .optional()
      .or(z.literal("")),
    endTime: z
      .string()
      .regex(timeRegex, "فرمت ساعت نامعتبر است")
      .optional()
      .or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    attendeeIds: z.array(z.string()).optional(),
    reminderMinutes: z.number().int().min(1).max(44640).optional().nullable(),
    playSound: z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (!d.startTime || !d.endTime || d.startTime === "" || d.endTime === "") return true
      return d.endTime > d.startTime
    },
    { message: "ساعت پایان باید بعد از ساعت شروع باشد", path: ["endTime"] }
  )

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(1300).max(1500),
  month: z.coerce.number().int().min(1).max(12),
})

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>
