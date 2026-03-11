import { Schema, model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    year: { type: Number, required: true },
    month: { type: Number, required: true },

    date: { type: String, required: true },

    time: {
      checkIn: {
        type: String,
        required: true,
      },
      checkOut: {
        type: String,
        default: null,
      },
    },

    notes: {
      type: String,
    },
    isLeave: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const AttendanceModel = model("Attendance", AttendanceSchema);
