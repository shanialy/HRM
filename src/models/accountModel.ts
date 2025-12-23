import { Schema, model } from "mongoose";

const AccountSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "EMPLOYEE", "USER"], required: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Account" },
    assignedEmployee: { type: Schema.Types.ObjectId, ref: "Account" },
    permissions: {
      createUser: { type: Boolean, default: false },
      chatAccess: { type: Boolean, default: false },
      viewReports: { type: Boolean, default: false },
    },
    userType: { type: String, required: true },
    targetAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AccountModel = model("Account", AccountSchema);
