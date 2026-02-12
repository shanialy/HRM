import { createServer, Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { PORT } from "./config/environment";
import socketHandler from "./socket/socketHandler";


const SERVER_PORT = PORT || 6000;
const httpServer: Server = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
  },
});
socketHandler(io);
httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
