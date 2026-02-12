import { z, ZodSchema } from "zod";

export const loginSchema: ZodSchema<{
  email: string;
  password: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(40),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
});
export const employeeStatus: ZodSchema<{
  status: string;
}> = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"])
});
