import { Schema, model } from "mongoose";

const PaymentSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true },
    screenshotUrl: { type: String, required: true },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PaymentModel = model("Payment", PaymentSchema);
