import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { PORT } from "./config/environment";
import socketHandler from "./socket/socketHandler";

const SERVER_PORT = PORT || 6000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io instance
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
  },
});

// Pass io to socket handler
socketHandler(io);

// Start server
httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
