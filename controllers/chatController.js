const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");
const AppError = require("../utils/appError");
const asyncCatcher = require("../utils/asyncCatcher");
const { encryptMsg } = require("../utils/encryptMsg");

const createSystemAnnouncement = async (chatId, senderId, text) => {
  const encoded = await encryptMsg(text);
  const sysMsg = await Message.create({
    sender: senderId,
    iv: encoded.iv,
    encryptedMsg: encoded.encryptedMsg,
    chat: chatId,
    isSystem: true,
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: sysMsg._id });

  return {
    id: sysMsg._id,
    sender: sysMsg.sender,
    chat: chatId,
    decryptedMessage: text,
    isSystem: true,
    edited: false,
    sentAt: sysMsg.sentAt,
  };
};
// Fetch all chats for the logged-in user's inbox
exports.fetchChats = asyncCatcher(async (req, res, next) => {
  let chats = await Chat.find({
    users: { $elemMatch: { $eq: req.user._id } },
    $or: [
      { isGroupChat: true },
      { latestMessage: { $exists: true, $ne: null } }, // Only show 1-on-1 chats that have sent messages
    ],
  })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 });

  chats = await User.populate(chats, {
    path: "latestMessage.sender",
    select: "name email",
  });

  res.status(200).json({
    status: "success",
    results: chats.length,
    data: {
      chats,
    },
  });
});

// Create a new Group Chat
exports.createGroupChat = asyncCatcher(async (req, res, next) => {
  if (!req.body.users || !req.body.name) {
    return next(
      new AppError("Please provide a group name and a list of users", 400),
    );
  }

  let users =
    typeof req.body.users === "string"
      ? JSON.parse(req.body.users)
      : req.body.users;

  if (users.length < 2) {
    return next(
      new AppError(
        "At least 2 other users are required to form a group chat",
        400,
      ),
    );
  }

  // Include the current logged-in user as a member
  users.push(req.user._id);

  const groupChat = await Chat.create({
    chatName: req.body.name,
    users: users,
    isGroupChat: true,
    groupAdmin: req.user._id,
  });

  const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(201).json({
    status: "success",
    data: {
      chat: fullGroupChat,
    },
  });
});

// Rename a Group Chat
exports.renameGroup = asyncCatcher(async (req, res, next) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName || !chatName.trim()) {
    return next(new AppError("chatId and a valid chatName are required", 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new AppError("Group chat not found", 404));
  }

  // Enforce admin-only rename
  if (String(chat.groupAdmin) !== String(req.user._id)) {
    return next(
      new AppError("Only the group admin can rename this group", 403),
    );
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { chatName: chatName.trim() },
    { new: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  // Broadcast live to the active room and every member's personal room
  const io = req.app.get("io");
  if (io && updatedChat) {
    io.to(String(updatedChat._id)).emit("group updated", updatedChat);
    updatedChat.users.forEach((user) => {
      io.to(String(user._id)).emit("group updated", updatedChat);
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      chat: updatedChat,
    },
  });
});

// Add a user to a Group Chat
exports.addToGroup = asyncCatcher(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return next(new AppError("chatId and userId are required", 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new AppError("Group chat not found", 404));
  }

  if (String(chat.groupAdmin) !== String(req.user._id)) {
    return next(new AppError("Only the group admin can add members", 403));
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new AppError("User not found", 404));
  }

  // 1. Add user to group in MongoDB first
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { users: userId } },
    { new: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  // 2. Save in-chat announcement message
  const announcementText = `${targetUser.name} is added to the group`;
  const systemMessage = await createSystemAnnouncement(
    chatId,
    req.user._id,
    announcementText,
  );

  // 3. Emit real-time updates
  const io = req.app.get("io");
  if (io && updatedChat) {
    // Push the group directly into the newly added user's inbox
    io.to(String(userId)).emit("added to group", updatedChat);

    // Broadcast announcement & updated member list to the active chat room
    io.to(String(chatId)).emit("message received", {
      chat: updatedChat,
      message: systemMessage,
    });
    io.to(String(chatId)).emit("group updated", updatedChat);

    // Update sidebar for all other members
    updatedChat.users.forEach((user) => {
      if (String(user._id) !== String(userId)) {
        io.to(String(user._id)).emit("group updated", updatedChat);
      }
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      chat: updatedChat,
      systemMessage,
    },
  });
});

// Remove a user from a Group Chat (or leave group)
exports.removeFromGroup = asyncCatcher(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return next(new AppError("chatId and userId are required", 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return next(new AppError("Group chat not found", 404));
  }

  const isSelfLeave = String(userId) === String(req.user._id);
  const isAdmin = String(chat.groupAdmin) === String(req.user._id);

  if (!isAdmin && !isSelfLeave) {
    return next(new AppError("Only the group admin can remove members", 403));
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return next(new AppError("User not found", 404));
  }

  // 1. Remove user from group in MongoDB
  let updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  // If the admin left and members remain, transfer admin to the next member
  if (
    updatedChat &&
    String(chat.groupAdmin) === String(userId) &&
    updatedChat.users.length > 0
  ) {
    updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { groupAdmin: updatedChat.users[0]._id },
      { new: true },
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");
  }

  // 2. Save in-chat announcement message
  const announcementText = isSelfLeave
    ? `${targetUser.name} left the group`
    : `${targetUser.name} was removed from the group`;

  const systemMessage = await createSystemAnnouncement(
    chatId,
    req.user._id,
    announcementText,
  );

  // 3. Emit real-time updates
  const io = req.app.get("io");
  if (io && updatedChat) {
    // Immediately remove the group from the removed/left user's inbox & close if open
    io.to(String(userId)).emit("removed from group", {
      chatId: String(chatId),
    });

    // Broadcast announcement & updated member list to the active chat room
    io.to(String(chatId)).emit("message received", {
      chat: updatedChat,
      message: systemMessage,
    });
    io.to(String(chatId)).emit("group updated", updatedChat);

    // Update sidebar for all remaining members
    updatedChat.users.forEach((user) => {
      io.to(String(user._id)).emit("group updated", updatedChat);
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      chat: updatedChat,
      systemMessage,
    },
  });
});
