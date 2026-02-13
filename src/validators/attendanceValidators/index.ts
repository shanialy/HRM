import { z, ZodSchema } from "zod";

export const adminAttendanceSchema = z.object({
  query: z.object({
    employeeId: z.string().optional(),

    month: z
      .string()
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12),
        {
          message: "Invalid month",
        },
      ),

    year: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(Number(val)), {
        message: "Invalid year",
      }),

    from: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
        message: "Invalid from date",
      }),

    to: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(new Date(val).getTime()), {
        message: "Invalid to date",
      }),

    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const LeaveSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Leave id is required"),
  }),

  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"], {
      errorMap: () => ({
        message: "status must be APPROVED or REJECTED",
      }),
    }),
  }),
});

export const checkInCheckOutSchema = z.object({
  body: z.object({
    type: z.enum(["CHECK_IN", "CHECK_OUT"], {
      errorMap: () => ({
        message: "Invalid attendance type",
      }),
    }),

    dateTime: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: "dateTime must be a valid date",
    }),

    notes: z.string().optional(),
  }),
});

export const AttendanceSchema = z.object({
  query: z.object({
    month: z
      .string()
      .optional()
      .refine(
        (val) =>
          val === undefined ||
          (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 12),
        { message: "Invalid month" },
      ),

    year: z
      .string()
      .optional()
      .refine((val) => val === undefined || !isNaN(Number(val)), {
        message: "Invalid year",
      }),

    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const requestLeaveSchema = z.object({
  body: z.object({
    date: z
      .string({
        required_error: "Leave date is required",
      })
      .refine((val) => !isNaN(new Date(val).getTime()), {
        message: "Invalid leave date",
      }),

    notes: z.string().optional(),
  }),
});
