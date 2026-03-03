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

    socket.join(userId);

    const existingConversations = await ConversationModel.find({
      participants: new mongoose.Types.ObjectId(userId),
      isDisabled: false,
    }).lean();

    existingConversations.forEach((conv: any) => {
      socket.join(conv._id.toString());
    });

    console.log("🟢 Joined rooms for user:", userId);

    // ======================================================
    // 📜 LIST CONVERSATIONS (FIXED VERSION)
    // ======================================================
    socket.on("conversations", async ({ page = 1, limit = 10 }) => {
      try {
        console.log("📥 conversations requested by:", userId); // 🔥 DEBUG

        const skip = (page - 1) * limit;

        // 🔥 FIX: safer query (no manual ObjectId conversion)
        const convs = await ConversationModel.find({
          participants: { $in: [userId] }, // ✅ FIXED
          isDisabled: false,
        })
          .populate("participants", "firstName lastName role profilePicture")
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        console.log("📦 Raw conversations found:", convs.length); // 🔥 DEBUG

        const conversationsWithUnread = convs.map((conv: any) => ({
          ...conv,
          unreadCount: conv.unreadCounts?.[userId] || 0,
        }));

        console.log(
          "📤 sending conversations:",
          conversationsWithUnread.length,
        ); // 🔥 DEBUG

        socket.emit("conversations", conversationsWithUnread);
      } catch (err) {
        console.log("❌ conversations error:", err); // 🔥 DEBUG
        socket.emit("error", {
          message: "Failed to load conversations",
        });
      }
    });

    // ======================================================
    // 📩 GET MESSAGES
    // ======================================================
    socket.on(
      "getMessages",
      async ({ conversationId, page = 1, limit = 20 }) => {
        try {
          const conversation = await ConversationModel.findById(conversationId);

          if (
            !conversation ||
            !conversation.participants.map((p) => p.toString()).includes(userId)
          ) {
            return socket.emit("error", { message: "Unauthorized" });
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
    // 🔍 SEARCH USERS
    // ======================================================
    socket.on("searchUsers", async ({ username }) => {
      try {
        if (!username) return socket.emit("searchUsers", []);

        const users = await UserModel.find({
          _id: { $ne: userId },
          role: { $in: ["ADMIN", "EMPLOYEE", "CLIENT"] },
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
    // 🆕 CREATE CONVERSATION
    // ======================================================
    socket.on("createConversation", async ({ receiverId }) => {
      try {
        let conversation = await ConversationModel.findOne({
          participants: {
            $all: [
              new mongoose.Types.ObjectId(userId),
              new mongoose.Types.ObjectId(receiverId),
            ],
            $size: 2,
          },
        });

        let isNewConversation = false;

        if (!conversation) {
          conversation = await ConversationModel.create({
            participants: [userId, receiverId],
            lastMessage: "",
            messageType: "TEXT",
            isDisabled: false,
            unreadCounts: {
              [userId]: 0,
              [receiverId]: 0,
            },
          });

          isNewConversation = true;
        }

        const conversationId = conversation._id.toString();
        socket.join(conversationId);

        const receiverSockets = await io.in(receiverId).fetchSockets();
        receiverSockets.forEach((s) => s.join(conversationId));

        if (isNewConversation) {
          const fullConversation = await ConversationModel.findById(
            conversationId,
          )
            .populate("participants", "firstName lastName role profilePicture")
            .lean();

          io.to(receiverId).emit("newConversation", {
            ...fullConversation,
            unreadCount: 0,
          });
        }

        socket.emit("createConversation", conversation);
      } catch {
        socket.emit("error", {
          message: "Failed to create conversation",
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

          // 🔥 FIX ADDED: Safe receiverId guard
          const receiverId = conversation.participants
            .map((p) => p.toString())
            .find((id) => id !== userId);

          if (!receiverId) {
            console.log("❌ Receiver not found");
            return socket.emit("error", { message: "Receiver not found" });
          }

          const newMessage = await MessageModel.create({
            conversation: conversationId,
            sender: userId,
            messageType,
            content: content || null,
            mediaUrl: mediaUrl || null,
            readBy: [userId],
          });

          await ConversationModel.findByIdAndUpdate(conversationId, {
            lastMessage: content || messageType,
            messageType,
            updatedAt: new Date(),
            $set: { [`unreadCounts.${userId}`]: 0 },
            $inc: { [`unreadCounts.${receiverId}`]: 1 },
          });

          const populatedMessage = await MessageModel.findById(newMessage._id)
            .populate("sender", "firstName lastName role profilePicture")
            .lean();

          io.to(conversationId).emit("message", populatedMessage);

          const updatedConversation =
            await ConversationModel.findById(conversationId).lean();

          // 🔥 FIX ADDED: Safe unreadCount access
          const unreadCount =
            updatedConversation && updatedConversation.unreadCounts
              ? updatedConversation.unreadCounts[receiverId] || 0
              : 0;

          io.to(receiverId).emit("unreadUpdate", {
            conversationId,
            unreadCount,
          });
        } catch {
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );

    // ======================================================
    // 🔥 MARK AS READ
    // ======================================================
    socket.on("markAsRead", async ({ conversationId }) => {
      try {
        await ConversationModel.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCounts.${userId}`]: 0 },
        });

        io.to(userId).emit("unreadUpdate", {
          conversationId,
          unreadCount: 0,
        });
      } catch {
        socket.emit("error", {
          message: "Failed to mark as read",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
    });
  });
};

export default socketHandler;
