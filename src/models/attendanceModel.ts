import { Schema, model } from "mongoose";

const AttendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    year: { type: Number, required: true },
    month: { type: Number, required: true },

    // 🔴 CHANGE 1
    // Date type ko String me change karo
    // taake PKT date "2026-03-11" store ho
    date: { type: String, required: true },

    time: {
      // 🔴 CHANGE 2
      // Date ko String me change karo
      // taake PKT datetime store ho
      checkIn: {
        type: String,
        required: true,
      },

      // 🔴 CHANGE 3
      // Date ko String me change karo
      checkOut: {
        type: String,
        default: null,
      },
    },

    notes: {
      type: String,
    },

    // // 🟢 Check-in location
    // checkInLatitude: {
    //   type: Number,
    //   required: true,
    // },

    // checkInLongitude: {
    //   type: Number,
    //   required: true,
    // },

    // // 🟢 Checkout location
    // checkOutLatitude: {
    //   type: Number,
    //   default: null,
    // },

    // checkOutLongitude: {
    //   type: Number,
    //   default: null,
    // },

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

// 🟢 Unique index same rehne do
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export const AttendanceModel = model("Attendance", AttendanceSchema);
