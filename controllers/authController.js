const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const asyncCatcher = require("../utils/asyncCatcher");
const { promisify } = require("util");

const createToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });
};

exports.signup = asyncCatcher(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });
  const token = createToken(newUser._id);
  res.status(200).json({
    status: "success",
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = asyncCatcher(async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return next(new AppError("Email and password are required to login", 400));
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.validatePassword(password, user.password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  const token = createToken(user._id);
  res.status(200).json({
    status: "success",
    token,
    data: {
      user: user,
    },
  });
});

exports.protect = asyncCatcher(async (req, res, next) => {
  //1) check if token exists
  //2) check if user still exists
  //3) check if password changed

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("User no longer exists"));
  }

  if (await user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("User recently changed password", 401));
  }
  req.user = user;
  next();
});
