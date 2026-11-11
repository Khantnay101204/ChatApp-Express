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
