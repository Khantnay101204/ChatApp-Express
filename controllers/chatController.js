const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const asyncCatcher = require("../utils/asyncCatcher");
const AppError = require("../utils/appError");

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

  if (!chatId || !chatName) {
    return next(new AppError("Please provide both chatId and chatName", 400));
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true, runValidators: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    return next(new AppError("Chat not found", 404));
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
    return next(new AppError("Please provide both chatId and userId", 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return next(new AppError("Group chat not found", 404));
  }

  // Admin permission check
  if (chat.groupAdmin.toString() !== req.user._id.toString()) {
    return next(new AppError("Only the group admin can add members", 403));
  }

  const added = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { users: userId } },
    { new: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json({
    status: "success",
    data: {
      chat: added,
    },
  });
});

// Remove a user from a Group Chat (or leave group)
exports.removeFromGroup = asyncCatcher(async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return next(new AppError("Please provide both chatId and userId", 400));
  }

  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroupChat) {
    return next(new AppError("Group chat not found", 404));
  }

  // Users can remove themselves (leave) OR the group admin can remove members
  if (
    chat.groupAdmin.toString() !== req.user._id.toString() &&
    userId !== req.user._id.toString()
  ) {
    return next(new AppError("Only the group admin can remove members", 403));
  }

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    { $pull: { users: userId } },
    { new: true },
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  res.status(200).json({
    status: "success",
    data: {
      chat: removed,
    },
  });
});
