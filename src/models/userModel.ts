import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    role: {
      type: String,
      enum: ["ADMIN", "EMPLOYEE", "CLIENT"],
      required: true,
    },
    designation: { type: String },
    department: { type: String },
    profilePicture: { type: String },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    userType: { type: String },
    targetAmount: { type: Number, default: 0 },
    salary: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const UserModel = model("User", UserSchema);
