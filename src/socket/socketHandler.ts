import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";
import { ChatModel } from "../models/chatModel";
import { ConversationModel } from "../models/conversationModel";

const socketHandler = (io: Server) => {

  // 🔐 JWT AUTH
  io.use((socket: any, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) return next(new Error("Authentication error"));

      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      );

      socket.user = decoded;
      next();

    } catch {
      next(new Error("Invalid token"));
    }
  });

  // 🔌 CONNECTION
  io.on("connection", (socket: any) => {

    console.log("User connected:", socket.user.id);
    socket.join(socket.user.id);

    // =========================================
    // 📋 LOAD CONVERSATIONS (UNCHANGED)
    // =========================================
    socket.on("load-conversations", async (data: any) => {
      try {

        const currentUserId = socket.user.id;
        const { page = 1, limit = 10 } = data;
        const skip = (page - 1) * limit;

        const conversations = await ConversationModel.find({
          participants: currentUserId
        })
          .populate("participants", "name email role profileImage")
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(limit);

        const totalConversations = await ConversationModel.countDocuments({
          participants: currentUserId
        });

        const formatted = conversations.map((conv: any) => {

          const unread =
            conv.unreadCount?.get(currentUserId) || 0;

          const otherUser = conv.participants.find(
            (p: any) => String(p._id) !== String(currentUserId)
          );

          return {
            _id: conv._id,
            user: otherUser,
            lastMessage: conv.lastMessage,
            lastMessageType: conv.lastMessageType,
            lastMessageAt: conv.lastMessageAt,
            unreadCount: unread
          };
        });

        socket.emit("conversation-list", {
          conversations: formatted,
          pagination: {
            totalConversations,
            currentPage: page,
            totalPages: Math.ceil(totalConversations / limit),
            hasMore: page < Math.ceil(totalConversations / limit)
          }
        });

      } catch (error) {
        console.log("Load conversations error:", error);
      }
    });

    // =========================================
    // 👀 RESET UNREAD (UNCHANGED + SAFETY)
    // =========================================
    socket.on("reset-unread", async (data: any) => {
      try {

        const currentUserId = socket.user.id;
        const { otherUserId } = data;

        const conversation: any = await ConversationModel.findOne({
          participants: { $all: [currentUserId, otherUserId] }
        });

        if (!conversation) return;

        if (!conversation.unreadCount) {      // 🔥 ADDED SAFETY
          conversation.unreadCount = new Map();
        }

        conversation.unreadCount.set(currentUserId, 0);
        await conversation.save();

        socket.emit("unread-reset-success", {
          otherUserId
        });

      } catch (error) {
        console.log("Reset unread error:", error);
      }
    });

    // =========================================
    // 📜 LOAD CHAT HISTORY (UNCHANGED)
    // =========================================
    socket.on("load-chat-history", async (data: any) => {
      try {

        const currentUserId = socket.user.id;
        const { otherUserId, page = 1, limit = 20 } = data;
        const skip = (page - 1) * limit;

        const messages = await ChatModel.find({
          $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId }
          ]
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const totalMessages = await ChatModel.countDocuments({
          $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId }
          ]
        });

        socket.emit("chat-history", {
          messages,
          pagination: {
            totalMessages,
            currentPage: page,
            totalPages: Math.ceil(totalMessages / limit)
          }
        });

      } catch (error) {
        console.log("History load error:", error);
      }
    });

    // =========================================
    // 💬 SEND MESSAGE (🔥 FULLY MEDIA READY)
    // =========================================
    socket.on("send-message", async (data: any) => {
      try {

        const { receiverId, message, messageType, mediaUrl } = data; // 🔥 UPDATED
        const senderId = socket.user.id;
        const senderRole = socket.user.role;

        // 🔥 ADDED: VALIDATION
        if (!receiverId || !messageType) return;

        const allowedTypes = ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"];
        if (!allowedTypes.includes(messageType)) return;

        if (messageType === "TEXT" && !message) return;
        if (messageType !== "TEXT" && !mediaUrl) return;

        const receiver: any = await UserModel.findById(receiverId);
        if (!receiver) return;

        let allowed = false;

        if (
          (senderRole === "ADMIN" && receiver.role === "EMPLOYEE") ||
          (senderRole === "EMPLOYEE" && receiver.role === "ADMIN")
        ) allowed = true;

        if (
          senderRole === "EMPLOYEE" &&
          receiver.role === "EMPLOYEE"
        ) allowed = true;

        if (
          senderRole === "CLIENT" &&
          receiver.role === "EMPLOYEE"
        ) {
          const senderUser: any = await UserModel.findById(senderId);
          if (
            senderUser &&
            String(senderUser.createdBy) === String(receiver._id)
          ) allowed = true;
        }

        if (
          senderRole === "EMPLOYEE" &&
          receiver.role === "CLIENT" &&
          String(receiver.createdBy) === String(senderId)
        ) allowed = true;

        if (!allowed) return;

        // 💾 SAVE MESSAGE (🔥 MEDIA SAFE)
        const newMessage = await ChatModel.create({
          sender: senderId,
          receiver: receiverId,
          messageType,
          message: message || null,        // 🔥 UPDATED
          mediaUrl: mediaUrl || null,      // 🔥 UPDATED
        });

        // 💬 UPDATE / CREATE CONVERSATION
        let conversation: any = await ConversationModel.findOne({
          participants: { $all: [senderId, receiverId] }
        });

        // 🔥 ADDED: SMART PREVIEW
        let previewText =
          messageType === "TEXT" ? message : messageType;

        if (!conversation) {

          conversation = await ConversationModel.create({
            participants: [senderId, receiverId],
            lastMessage: previewText,       // 🔥 UPDATED
            lastMessageType: messageType,
            lastMessageAt: new Date(),
          });

          if (!conversation.unreadCount) {  // 🔥 ADDED SAFETY
            conversation.unreadCount = new Map();
          }

          conversation.unreadCount.set(receiverId, 1);
          await conversation.save();

        } else {

          conversation.lastMessage = previewText; // 🔥 UPDATED
          conversation.lastMessageType = messageType;
          conversation.lastMessageAt = new Date();

          if (!conversation.unreadCount) {
            conversation.unreadCount = new Map();
          }

          const currentUnread =
            conversation.unreadCount.get(receiverId) || 0;

          conversation.unreadCount.set(receiverId, currentUnread + 1);

          await conversation.save();
        }

        // 📡 EMIT MESSAGE
        io.to(receiverId).emit("receive-message", newMessage);
        socket.emit("receive-message", newMessage);

        // 🔥 AUTO UPDATE SIDEBAR
        io.to(receiverId).emit("conversation-updated");
        socket.emit("conversation-updated");

      } catch (error) {
        console.log("Send message error:", error);
      }
    });

  });
};

export default socketHandler;
