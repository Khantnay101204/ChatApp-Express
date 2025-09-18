const { send } = require("process");
const Message = require("../models/messageModel");
const AppError = require("../utils/appError");
const asyncCatcher = require("../utils/asyncCatcher");

const { promisify } = require("util");
const { decryptMsg } = require("../utils/decryptMsg");
const { encryptMsg } = require("../utils/encryptMsg");

exports.createMessage = asyncCatcher(async (req, res, next) => {
  if (!req.body.message) {
    return next(new AppError("Message is required", 400));
  }
  const encoded = await encryptMsg(req.body.message);

  const message = await Message.create({
    sender: req.user._id,
    iv: encoded.iv,
    encryptedMsg: encoded.encryptedMsg,
  });

  res.status(201).json({
    status: "success",
    data: {
      message,
    },
  });
});

exports.getMessage = asyncCatcher(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  const decryptedMessage = await decryptMsg(message);
  res.status(200).json({
    status: "success",
    data: {
      sender: message.sender,
      message: decryptedMessage,
    },
  });
});

exports.getAllMessages = asyncCatcher(async (req, res, next) => {
  const message = await Message.find();

  const messages = await Promise.all(
    message.map(async (el) => {
      const decryptedMessage = await decryptMsg(el);
      return {
        id: el.id,
        sender: el.sender,
        decryptedMessage,
        edited: el.edited,
        sentAt: el.sentAt,
      };
    })
  );

  res.status(200).json({
    status: "success",
    data: {
      messages,
    },
  });
});

exports.editMessage = asyncCatcher(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    next(new AppError("Message doesn't exist"), 404);
  }

  if (message.sender !== req.user.id) {
    next(new AppError("You are not authorized to edit this message"), 401);
  }
  const encrypted = await encryptMsg(req.body.message);
  const editedMessage = await Message.findByIdAndUpdate(
    req.params.id,
    {
      iv: encrypted.iv,
      encryptedMsg: encrypted.encryptedMsg,
      edited: true,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    status: "success",
    data: {
      message: editedMessage,
    },
  });
});
