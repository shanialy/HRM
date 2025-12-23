import { Schema, model } from "mongoose";

const ChatSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"],
      required: true,
    },
    message: { type: String },
    mediaUrl: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ChatModel = model("Chat", ChatSchema);
