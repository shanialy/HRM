import { Schema, model } from "mongoose";

const UserAssignmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    fromEmployee: { type: Schema.Types.ObjectId, ref: "Account" },
    toEmployee: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  },
  { timestamps: true }
);

export const UserAssignmentModel = model(
  "UserAssignment",
  UserAssignmentSchema
);
