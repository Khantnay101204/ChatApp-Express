const app = require("./app");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const Message = require("./models/messageModel");
const { decryptMsg } = require("./utils/decryptMsg");
const { encryptMsg } = require("./utils/encryptMsg");

const port = process.env.PORT;
const DB = process.env.DATABASE.replace("<password>", process.env.DB_PASSWORD);
mongoose
  .connect(DB)
  .then(() => console.log("Database Successfully Connected "));

const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:8080",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  // 1. Join personal user room for live sidebar/inbox updates
  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(userId);
    socket.emit("connected");
  });

  // 2. Join a specific chat room when opened
  socket.on("join chat", (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  // 3. Broadcast newly saved messages to room members & their inboxes
  socket.on("new message", ({ chat, message }) => {
    if (!chat || !message) return;

    // Push live message to everyone currently viewing this chat room
    socket.to(chat._id).emit("message received", { chat, message });

    // Notify each participant's personal room so their inbox refreshes
    if (Array.isArray(chat.users)) {
      chat.users.forEach((user) => {
        const userId = typeof user === "object" ? user._id : user;
        const senderId =
          typeof message.sender === "object"
            ? message.sender._id
            : message.sender;

        if (userId && userId !== senderId) {
          socket.to(userId).emit("inbox updated", { chat, message });
        }
      });
    }
  });

  // 4. Broadcast inline message edits in real time
  socket.on("edit message", ({ chatId, messageId, updatedText }) => {
    if (!chatId || !messageId) return;
    socket.to(chatId).emit("message edited", {
      chatId,
      messageId,
      updatedText,
    });
  });
});

// Make sure you call server.listen (NOT app.listen)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server & Socket.IO running on port ${PORT}`);
});
