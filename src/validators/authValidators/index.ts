import { z, ZodSchema } from "zod";
import mongoose from "mongoose";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const createEmployeeSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    email: z.string().trim().email("Invalid email"),
    userType: z.string().min(1, "User type is required"),
    salary: z.coerce.number().optional(),
    targetAmount: z.coerce.number().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const getAllEmployeesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const getEmployeeByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Employee ID is required"),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    department: z.string().optional(),
    salary: z.number().positive().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const changeEmployeeStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Employee ID is required"),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    department: z.string().optional(),
    salary: z.number().positive().optional(),
  }),
});

export const adminGetAllAttendanceSchema = z.object({
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

export const approveRejectLeaveSchema = z.object({
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

export const getMyAttendanceSchema = z.object({
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

export const createClientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    address: z.string().min(3),
    phone: z.string().min(10),
  }),
});

export const getMyClientsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : 1)),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : 10)),
  }),
});

export const getSingleClientSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid client id",
    }),
  }),
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid client id",
    }),
  }),

  body: z
    .object({
      firstName: z.string().min(2).optional(),
      lastName: z.string().min(2).optional(),
      email: z.string().email().optional(),
      city: z.string().min(2).optional(),
    })
    .refine(
      (data) => data.firstName || data.lastName || data.email || data.city,
      {
        message: "At least one field is required to update",
      },
    ),
});

export const deleteClientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid client id"),
  }),
});

export const clientLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").trim().toLowerCase(),

    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});
