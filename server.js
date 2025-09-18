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
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected: ", socket.id);

  socket.on("send_message", async (data) => {
    const { userID, msg } = data;

    const encoded = await encryptMsg(msg);
    const message = await Message.create({
      sender: userID,
      iv: encoded.iv,
      encryptedMsg: encoded.encryptedMsg,
    });

    io.emit("receive_message", {
      id: message.id,
      sender: userID,
      decryptedMessage: await decryptMsg(message),
      sentAt: message.sentAt,
    });
  });

  socket.on("edit_message", async (data) => {
    const { msgObj, editMsg } = data;
    const encoded = await encryptMsg(editMsg);
    const updated = await Message.findByIdAndUpdate(
      msgObj.id,
      {
        iv: encoded.iv,
        encryptedMsg: encoded.encryptedMsg,
        edited: true,
      },
      { new: true }
    );
    const decryptedMessage = await decryptMsg(updated);

    io.emit("message_edited", {
      id: updated.id,
      decryptedMessage,
      iv: updated.iv,
      edited: true,
    });
  });
});

server.listen(port, () => {
  console.log("server is running at " + port);
});
