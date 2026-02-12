import { Schema, model } from "mongoose";

const ChatSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔥 ADDED (single field index for performance)
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 🔥 ADDED (single field index for performance)
    },

    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"],
      required: true,
    },

    message: {
      type: String,
      trim: true,        // 🔥 ADDED (auto remove extra spaces)
      default: null,     // 🔥 UPDATED (previously no default)
    },

    mediaUrl: {
      type: String,
      default: null,     // 🔥 UPDATED (explicit default)
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ===============================
// 🔥 ADDED PERFORMANCE INDEXES
// ===============================

// Fast chat history query
ChatSchema.index({ sender: 1, receiver: 1, createdAt: -1 }); // 🔥 ADDED
ChatSchema.index({ receiver: 1, sender: 1, createdAt: -1 }); // 🔥 ADDED

// Sorting optimization
ChatSchema.index({ createdAt: -1 }); // 🔥 ADDED

export const ChatModel = model("Chat", ChatSchema);
