const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema({
  sender: {
    type: String,
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
    default: Date.now(),
  },
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
