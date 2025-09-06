import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
import { Server } from "socket.io";

import Msg from "./model/messageModel.js";
dotenv.config({ path: "./config.env" });

mongoose
  .connect(process.env.DATABASE)
  .then(console.log("DB connection successful"));

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
  console.log(`App running on port `, PORT);
});

const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:8080",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("sendMessage", async (text, userId) => {
    try {
      const newMsg = await Msg.create({
        text: text,
        user: userId,
      });

      io.emit("receiveMessage", newMsg);
    } catch (err) {
      console.log(err);
    }
  });
});
