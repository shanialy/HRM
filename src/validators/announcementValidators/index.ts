import { z } from "zod";
import mongoose from "mongoose";

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(5, "Description must be at least 5 characters"),
  }),
});

export const getAnnouncementsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : 1)),

    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : 20)),

    search: z.string().optional(),
  }),
});

export const updateAnnouncementSchema = z.object({
  params: z.object({
    id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid announcement id",
    }),
  }),

  body: z
    .object({
      title: z.string().min(3).optional(),
      description: z.string().min(5).optional(),
    })
    .refine((data) => data.title || data.description, {
      message: "At least one field is required to update",
    }),
});

export const deleteAnnouncementSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid announcement id"),
  }),
});
