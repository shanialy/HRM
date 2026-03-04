import { Schema, model } from "mongoose";

const AttendanceRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["CHECK_IN", "CHECK_OUT"],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/* ================= DUPLICATE REQUEST PROTECTION ================= */

AttendanceRequestSchema.index(
  { user: 1, date: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
  },
);

export const AttendanceRequestModel = model(
  "AttendanceRequest",
  AttendanceRequestSchema,
);
