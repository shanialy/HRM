import { z, ZodSchema } from "zod";

export const signupSchema: ZodSchema<{
  email: string;
  password: string;
  deviceToken: string;
  deviceType: string;
  userType: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  deviceToken: z.string(),
  deviceType: z.enum(["Android", "IOS", "Postman"]),
  userType: z.enum(["User", "Therapist"]),
});

export const loginSchema: ZodSchema<{
  email: string;
  password: string;
  deviceToken: string;
  deviceType: string;
  // userType: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100),
  deviceToken: z.string(),
  deviceType: z.enum(["Android", "IOS", "Postman"]),
  // userType: z.enum(["User", "Therapist"]),
});

export const otpVerifySchema: ZodSchema<{
  email: string;
  otp: string;
}> = z.object({
  email: z.string(),
  otp: z.string(),
});
export const otpSendSchema: ZodSchema<{
  email: string;
}> = z.object({
  email: z.string().email("Invalid email format").max(255),
});
export const changePasswordSchema: ZodSchema<{
  oldPassword: string;
  newPassword: string;
}> = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
});
export const resetPasswordSchema: ZodSchema<{
  password: string;
}> = z.object({
  password: z.string(),
});

const locationSchema = z.object({
  type: z.enum(["Point"]),
  coordinates: z.array(z.number()),
  address: z.string(),
});

const aboutYourselfSchema = z.object({
  description: z.string(),
  height: z.number(),
  sexualOrientation: z.string().optional().nullable(),
  otherSexualOrientation: z.string().optional().nullable(),
});

export const addPartnerSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

export const acceptPartnerRequestSchema = z.object({
  code: z.string().optional().nullable(),
});

export const createProfileSchema: ZodSchema<{
  name: string;
  gender: string;
  age: string;
}> = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.string(),
});

export const updateProfileSchema: ZodSchema<{
  name: string;
  gender: string;
  age: string;
}> = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.string(),
});
