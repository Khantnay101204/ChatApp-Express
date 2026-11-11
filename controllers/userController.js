const User = require("../models/userModel");
const asyncCatcher = require("../utils/asyncCatcher");

exports.getUsernameById = asyncCatcher(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    status: "success",
    data: {
      username: user.name,
    },
  });
});

// GET /api/v1/users?search=user2
exports.searchUsers = asyncCatcher(async (req, res, next) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  // Find matching users, excluding the current logged-in user
  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select("name email");

  res.status(200).json({
    status: "success",
    results: users.length,
    data: { users },
  });
});
