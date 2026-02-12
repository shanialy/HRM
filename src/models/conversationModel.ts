import { Schema, model } from "mongoose";

const ConversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }
    ],

    lastMessage: {
      type: String,
      trim: true,     // 🔥 ADDED
      default: "",    // 🔥 UPDATED (previously no default)
    },

    lastMessageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"],
      default: "TEXT",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,  // 🔥 UPDATED (previously no default)
      index: true,        // 🔥 ADDED (sorting optimization)
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    }

  },
  { timestamps: true }
);

// =====================================
// ❌ REMOVED OLD INDEXES
// ConversationSchema.index({ participants: 1 });
// ConversationSchema.index({ lastMessageAt: -1 });
// =====================================


// =====================================
// 🔥 ADDED COMPOUND INDEX (IMPORTANT)
// =====================================

ConversationSchema.index({ participants: 1, lastMessageAt: -1 }); // 🔥 ADDED

export const ConversationModel = model(
  "Conversation",
  ConversationSchema
);
