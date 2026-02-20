import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"],
      required: true,
    },

    content: {
      type: String,
      trim: true,
      default: null,
    },

    mediaUrl: {
      type: String,
      default: null,
    },

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

// 🔥 Fast pagination inside conversation
MessageSchema.index({ conversation: 1, createdAt: -1 });

export const MessageModel = model("Message", MessageSchema);
