import { z, ZodSchema } from "zod";
import mongoose from "mongoose";

export const createClientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    address: z.string().min(3),
    phone: z.string().min(10),
  }),
});

export const getClientsSchema = z.object({
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

export const SingleClientSchema = z.object({
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
