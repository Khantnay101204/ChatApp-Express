const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const asyncCatcher = require("../utils/asyncCatcher");
const { decryptMsg } = require("../utils/decryptMsg");
const { encryptMsg } = require("../utils/encryptMsg");

exports.createMessage = asyncCatcher(async (req, res, next) => {
  const { message, chatId, recipientId, recipientName } = req.body;

  if (!message || (!chatId && !recipientId && !recipientName)) {
    return next(
      new AppError(
        "Message content and either chatId, recipientId, or recipientName are required",
        400,
      ),
    );
  }

  // Declare variables at the top
  let targetChatId = chatId;
  let targetRecipientId = recipientId;

  // 1. If recipientName is passed instead of recipientId, look up the target user
  if (!targetRecipientId && recipientName) {
    const targetUser = await User.findOne({ name: recipientName });
    if (!targetUser) {
      return next(new AppError("Recipient user not found", 404));
    }
    targetRecipientId = targetUser._id;
  }

  // 2. If sending to an existing chatId, verify sender membership
  if (targetChatId) {
    const existingChat = await Chat.findById(targetChatId);
    if (!existingChat) {
      return next(new AppError("Chat not found", 404));
    }

    const isMember = existingChat.users.some(
      (userId) => userId.toString() === req.user._id.toString(),
    );

    if (!isMember) {
      return next(
        new AppError(
          "You are not authorized to send messages to this chat",
          403,
        ),
      );
    }
  }

  // 3. TELEGRAM-STYLE LAZY CHAT CREATION:
  // Create 1-on-1 chat dynamically on first message if targetChatId doesn't exist yet
  if (!targetChatId && targetRecipientId) {
    let chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: targetRecipientId } } },
      ],
    });

    if (!chat) {
      chat = await Chat.create({
        isGroupChat: false,
        users: [req.user._id, targetRecipientId],
      });
    }

    targetChatId = chat._id;
  }

  // 4. Encrypt message
  const encoded = await encryptMsg(message);

  // 5. Save message to DB linked to targetChatId
  const newMessage = await Message.create({
    sender: req.user._id,
    iv: encoded.iv,
    encryptedMsg: encoded.encryptedMsg,
    chat: targetChatId,
  });

  // 6. Update latest message reference on Chat model
  await Chat.findByIdAndUpdate(targetChatId, { latestMessage: newMessage._id });

  // 7. Decrypt for immediate UI response
  const decryptedText = await decryptMsg(newMessage);

  res.status(201).json({
    status: "success",
    data: {
      message: {
        id: newMessage._id,
        sender: newMessage.sender,
        chat: targetChatId,
        message: decryptedText,
        sentAt: newMessage.sentAt,
      },
    },
  });
});

exports.getChatMessages = asyncCatcher(async (req, res, next) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new AppError("Chat not found", 404));
  }

  const isMember = chat.users.some(
    (userId) => userId.toString() === req.user._id.toString(),
  );

  if (!isMember) {
    return next(new AppError("You are not a member of this chat", 403));
  }

  const rawMessages = await Message.find({ chat: chatId }).sort({ sentAt: 1 });

  const messages = await Promise.all(
    rawMessages.map(async (el) => {
      const decryptedMessage = await decryptMsg(el);
      return {
        id: el._id,
        sender: el.sender,
        chat: el.chat,
        decryptedMessage,
        edited: el.edited,
        sentAt: el.sentAt,
      };
    }),
  );

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: {
      messages,
    },
  });
});

// Get a single message by message ID
exports.getMessage = asyncCatcher(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError("Message not found", 404));
  }

  const decryptedMessage = await decryptMsg(message);

  res.status(200).json({
    status: "success",
    data: {
      id: message._id,
      sender: message.sender,
      chat: message.chat,
      message: decryptedMessage,
      sentAt: message.sentAt,
    },
  });
});

// Edit a single message by message ID
exports.editMessage = asyncCatcher(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError("Message not found", 404));
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to edit this message", 401),
    );
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
    },
  );

  const decryptedMessage = await decryptMsg(editedMessage);

  res.status(200).json({
    status: "success",
    data: {
      message: {
        id: editedMessage._id,
        sender: editedMessage.sender,
        chat: editedMessage.chat,
        message: decryptedMessage,
        edited: editedMessage.edited,
        sentAt: editedMessage.sentAt,
      },
    },
  });
});
