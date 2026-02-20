import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ConversationModel } from "../models/conversationModel";
import { MessageModel } from "../models/messageModel";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

const socketHandler = (io: Server) => {
  // ======================================================
  // 🔐 JWT AUTH MIDDLEWARE
  // Every socket connection must provide valid token
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

    // ------------------------------------------------------
    // 🏠 Join personal room (used for direct notifications)
    // ------------------------------------------------------
    socket.join(userId);

    // ------------------------------------------------------
    // 🏠 Join all existing conversation rooms
    // So user receives live messages
    // ------------------------------------------------------
    const existingConversations = await ConversationModel.find({
      participants: new mongoose.Types.ObjectId(userId),
      isDisabled: false,
    });

    existingConversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    // ======================================================
    // 🆕 CREATE CONVERSATION (if not exists)
    // ======================================================
    socket.on(
      "createConversation",
      async ({ receiverId }: { receiverId: string }) => {
        console.log("🔥 createConversation triggered");
        console.log("Sender:", userId);
        console.log("Receiver:", receiverId);
        try {
          // Check if conversation already exists between 2 users
          let conversation = await ConversationModel.findOne({
            participants: {
              $all: [
                new mongoose.Types.ObjectId(userId),
                new mongoose.Types.ObjectId(receiverId),
              ],
              $size: 2,
            },
          });

          // If not exists → create new
          if (!conversation) {
            conversation = await ConversationModel.create({
              participants: [userId, receiverId],
              lastMessage: "",
              lastMessageType: "TEXT",
              lastMessageAt: new Date(),
              isDisabled: false,
            });
          }

          // Join both users into that room
          socket.join(conversation._id.toString());

          // Notify receiver
          io.to(receiverId).emit("newConversation", {
            conversationId: conversation._id,
          });

          socket.emit("conversationCreated", conversation);
        } catch {
          socket.emit("error", { message: "Failed to create conversation" });
        }
      },
    );

    // ======================================================
    // 📜 LIST CONVERSATIONS (with pagination)
    // WhatsApp home screen
    // ======================================================
    socket.on(
      "conversations",
      async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
        try {
          const skip = (page - 1) * limit;

          const convs = await ConversationModel.find({
            participants: new mongoose.Types.ObjectId(userId),
            isDisabled: false,
          })
            .populate("participants", "firstName lastName role profilePicture")
            .sort({ lastMessageAt: -1 }) // latest chat first
            .skip(skip)
            .limit(limit)
            .lean();

          // Calculate unread count for each conversation
          const formatted = await Promise.all(
            convs.map(async (conv: any) => {
              const unreadCount = await MessageModel.countDocuments({
                conversation: conv._id,
                sender: { $ne: userId },
                readBy: { $ne: userId },
              });

              return {
                ...conv,
                unreadCount,
              };
            }),
          );

          socket.emit("conversations", formatted);
        } catch {
          socket.emit("error", { message: "Failed to load conversations" });
        }
      },
    );

    // ======================================================
    // ✉ SEND + RECEIVE MESSAGE (same event)
    // ======================================================
    socket.on(
      "message",
      async ({
        conversationId,
        messageType,
        content,
        mediaUrl,
      }: {
        conversationId: string;
        messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
        content?: string;
        mediaUrl?: string;
      }) => {
        try {
          const conversation = await ConversationModel.findById(conversationId);

          if (!conversation)
            return socket.emit("error", {
              message: "Conversation not found",
            });

          // Security check
          if (
            !conversation.participants.map((p) => p.toString()).includes(userId)
          ) {
            return socket.emit("error", { message: "Unauthorized" });
          }

          // Save message in DB
          const newMessage = await MessageModel.create({
            conversation: conversationId,
            sender: userId,
            messageType,
            content: content || null,
            mediaUrl: mediaUrl || null,
            readBy: [userId], // sender auto-read
          });

          // Update conversation last message info
          await ConversationModel.findByIdAndUpdate(conversationId, {
            lastMessage: content || messageType,
            lastMessageType: messageType,
            lastMessageAt: new Date(),
          });

          // Populate sender info
          const populatedMessage = await MessageModel.findById(newMessage._id)
            .populate("sender", "firstName lastName role profilePicture")
            .lean();

          // Emit to everyone in conversation room
          io.to(conversationId).emit("message", populatedMessage);
        } catch {
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );

    // ======================================================
    // 📩 GET MESSAGES (Pagination)
    // ======================================================
    socket.on(
      "getMessages",
      async ({
        conversationId,
        page = 1,
        limit = 20,
      }: {
        conversationId: string;
        page?: number;
        limit?: number;
      }) => {
        const skip = (page - 1) * limit;

        const messages = await MessageModel.find({
          conversation: conversationId,
        })
          .sort({ createdAt: -1 }) // latest first
          .skip(skip)
          .limit(limit)
          .populate("sender", "firstName lastName role profilePicture")
          .lean();

        socket.emit("getMessages", messages);
      },
    );

    // ======================================================
    // 👀 MARK AS READ
    // ======================================================
    socket.on(
      "markAsRead",
      async ({ conversationId }: { conversationId: string }) => {
        await MessageModel.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          },
          {
            $addToSet: { readBy: userId },
          },
        );
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
