import { Schema, model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    date: { type: Date, required: true },
    time: {
      checkIn: {
        type: Date,
        required: true,
      },
      checkOut: {
        type: Date,

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

export const AttendanceModel = model("Attendance", AttendanceSchema);
