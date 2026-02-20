import { Schema, model } from "mongoose";

const ConversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },

    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"],
      default: "TEXT",
    },

    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// 🔥 Important for fast chat list sorting
ConversationSchema.index({ participants: 1, updatedAt: -1 });

export const ConversationModel = model("Conversation", ConversationSchema);
