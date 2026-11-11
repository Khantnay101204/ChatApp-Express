const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Message must have a sender."],
  },

  iv: {
    type: String,
    required: true,
  },
  encryptedMsg: {
    type: String,
    required: true,
  },
  edited: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },

  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: [true, "Message must belong to a chat."],
  },

  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

MessageSchema.index({ chat: 1, sentAt: 1 });

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
