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

    // 🟢 Check-in location
    checkInLatitude: {
      type: Number,
      required: true,
    },

    checkInLongitude: {
      type: Number,
      required: true,
    },

    // 🟢 Checkout location
    checkOutLatitude: {
      type: Number,
      default: null,
    },

    checkOutLongitude: {
      type: Number,
      default: null,
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
