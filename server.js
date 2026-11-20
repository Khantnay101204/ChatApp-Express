const app = require("./app");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const DB = process.env.DATABASE.replace("<password>", process.env.DB_PASSWORD);
mongoose.connect(DB).then(() => console.log("Database Successfully Connected"));

const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:8080",
    credentials: true,
  },
});

// Expose Socket.IO instance to Express controllers via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  // 1. Join personal user room for live inbox updates, renames & group notifications
  socket.on("setup", (userId) => {
    if (!userId) return;
    socket.join(String(userId));
    socket.emit("connected");
  });

  // 2. Join a specific chat room when opened
  socket.on("join chat", (chatId) => {
    if (!chatId) return;
    socket.join(String(chatId));
  });

  // 3. Broadcast newly saved messages to active room members & their inboxes
  socket.on("new message", ({ chat, message }) => {
    if (!chat || !message) return;

    socket.to(String(chat._id)).emit("message received", { chat, message });

    if (Array.isArray(chat.users)) {
      chat.users.forEach((user) => {
        const userId = String(typeof user === "object" ? user._id : user);
        const senderId = String(
          typeof message.sender === "object"
            ? message.sender._id
            : message.sender,
        );

        if (userId && userId !== senderId) {
          socket.to(userId).emit("inbox updated", { chat, message });
        }
      });
    }
  });

  // 4. Broadcast inline message edits in real time
  socket.on("edit message", ({ chatId, messageId, updatedText }) => {
    if (!chatId || !messageId) return;
    socket.to(String(chatId)).emit("message edited", {
      chatId,
      messageId,
      updatedText,
    });
  });

  // 5. Fallback listener if group rename is emitted from client
  socket.on("group renamed", (updatedChat) => {
    if (!updatedChat || !Array.isArray(updatedChat.users)) return;

    socket.to(String(updatedChat._id)).emit("group updated", updatedChat);
    updatedChat.users.forEach((user) => {
      const userId = String(typeof user === "object" ? user._id : user);
      if (userId) {
        socket.to(userId).emit("group updated", updatedChat);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server & Socket.IO running on port ${PORT}`);
});
