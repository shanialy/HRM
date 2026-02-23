import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ConversationModel } from "../models/conversationModel";
import { MessageModel } from "../models/messageModel";
import { UserModel } from "../models/userModel";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

const socketHandler = (io: Server) => {
  // ======================================================
  // 🔐 JWT AUTH MIDDLEWARE
  // ======================================================
  io.use((socket: Socket & { user?: JwtPayload }, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET as string,
      ) as JwtPayload;

      socket.user = decoded;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  // ======================================================
  // 🔌 ON CONNECTION
  // ======================================================
  io.on("connection", async (socket: Socket & { user?: JwtPayload }) => {
    const userId = socket.user!.id;
    console.log("User connected:", userId);

    // 🏠 Join personal room (for direct notifications)
    socket.join(userId);

    // 🏠 Join all existing conversation rooms
    const existingConversations = await ConversationModel.find({
      participants: new mongoose.Types.ObjectId(userId),
      isDisabled: false,
    });

    existingConversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    // ======================================================
    // 🔍 SEARCH USERS BY USERNAME
    // ======================================================
    socket.on("searchUsers", async ({ username }: { username: string }) => {
      try {
        if (!username) {
          return socket.emit("searchUsers", []);
        }

        const users = await UserModel.find({
          _id: { $ne: userId }, // ❌ exclude self
          role: { $in: ["ADMIN", "EMPLOYEE"] }, // allow only admin & employees
          $or: [
            { firstName: { $regex: username, $options: "i" } },
            { lastName: { $regex: username, $options: "i" } },
            { email: { $regex: username, $options: "i" } },
          ],
        }).select("_id firstName lastName role profilePicture");

        socket.emit("searchUsers", users);
      } catch {
        socket.emit("error", { message: "Search failed" });
      }
    });
    // ======================================================
    // 🆕 CREATE CONVERSATION (IF NOT EXISTS)
    // ======================================================
    socket.on(
      "createConversation",
      async ({ receiverId }: { receiverId: string }) => {
        try {
          // ❌ Prevent self chat
          if (receiverId === userId) {
            return socket.emit("error", {
              message: "You cannot chat with yourself",
            });
          }

          let conversation = await ConversationModel.findOne({
            participants: {
              $all: [
                new mongoose.Types.ObjectId(userId),
                new mongoose.Types.ObjectId(receiverId),
              ],
              $size: 2,
            },
          });

          // If not exists → create new conversation
          if (!conversation) {
            conversation = await ConversationModel.create({
              participants: [userId, receiverId],
              lastMessage: "",
              messageType: "TEXT", // 🔥 FIXED: model field name
              isDisabled: false,
            });
          }

          // Join conversation room
          socket.join(conversation._id.toString());

          // Notify receiver (optional — keep separate)
          io.to(receiverId).emit("newConversation", {
            conversationId: conversation._id,
          });

          // 🔥 CHANGED: response event name same as listener
          socket.emit("createConversation", conversation);

          // Previously was:
          // socket.emit("conversationCreated", conversation);
        } catch {
          socket.emit("error", {
            message: "Failed to create conversation",
          });
        }
      },
    );

    // ======================================================
    // 📜 LIST CONVERSATIONS (Home Screen)
    // ======================================================
    socket.on("conversations", async ({ page = 1, limit = 10 }) => {
      try {
        const skip = (page - 1) * limit;

        const convs = await ConversationModel.find({
          participants: new mongoose.Types.ObjectId(userId),
          isDisabled: false,
        })
          .populate("participants", "firstName lastName role profilePicture")
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        socket.emit("conversations", convs);
      } catch {
        socket.emit("error", {
          message: "Failed to load conversations",
        });
      }
    });
    // ======================================================
    // ✉ SEND MESSAGE
    // ======================================================
    socket.on(
      "message",
      async ({ conversationId, messageType, content, mediaUrl }) => {
        try {
          const conversation = await ConversationModel.findById(conversationId);

          if (!conversation) {
            return socket.emit("error", {
              message: "Conversation not found",
            });
          }

          // 🔐 Security: Only participants can send
          if (
            !conversation.participants.map((p) => p.toString()).includes(userId)
          ) {
            return socket.emit("error", {
              message: "Unauthorized",
            });
          }

          const newMessage = await MessageModel.create({
            conversation: conversationId,
            sender: userId,
            messageType,
            content: content || null,
            mediaUrl: mediaUrl || null,
            readBy: [userId],
          });

          // ======================================================
          // 🔥 FIX STARTS HERE
          // ======================================================

          await ConversationModel.findByIdAndUpdate(conversationId, {
            lastMessage: content || messageType,

            messageType: messageType,
            // 🔥 CHANGED: lastMessageType → messageType
            // Reason: ConversationModel me field name "messageType" hai

            // 🔥 REMOVED: lastMessageAt
            // Reason: Model me lastMessageAt field exist nahi karti
            // timestamps: true already automatically updates updatedAt
          });

          // ======================================================
          // 🔥 FIX ENDS HERE
          // ======================================================

          const populatedMessage = await MessageModel.findById(newMessage._id)
            .populate("sender", "firstName lastName role profilePicture")
            .lean();

          io.to(conversationId).emit("message", populatedMessage);
        } catch {
          socket.emit("error", {
            message: "Failed to send message",
          });
        }
      },
    );
    // ======================================================
    // 📩 GET MESSAGES (WITH SECURITY CHECK)
    // ======================================================
    socket.on(
      "getMessages",
      async ({ conversationId, page = 1, limit = 20 }) => {
        try {
          const conversation = await ConversationModel.findById(conversationId);

          // 🔐 Security: Only participants can fetch messages
          if (
            !conversation ||
            !conversation.participants.map((p) => p.toString()).includes(userId)
          ) {
            return socket.emit("error", {
              message: "Unauthorized",
            });
          }

          const skip = (page - 1) * limit;

          const messages = await MessageModel.find({
            conversation: conversationId,
          })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "firstName lastName role profilePicture")
            .lean();

          socket.emit("getMessages", messages);
        } catch {
          socket.emit("error", {
            message: "Failed to fetch messages",
          });
        }
      },
    );

    // ======================================================
    // ❌ DISCONNECT
    // ======================================================
    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
    });
  });
};

export default socketHandler;
