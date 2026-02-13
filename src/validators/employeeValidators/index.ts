import { z, ZodSchema } from "zod";

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

export const AllEmployeesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  }),
});

export const EmployeeByIdSchema = z.object({
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

export const EmployeeStatusSchema = z.object({
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
