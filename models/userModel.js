const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "User must have a username."],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "User must have an email."],
    unique: true,
    validate: [validator.isEmail, "Invalid Email"],
  },

  password: {
    type: "String",
    required: [true, "User must have a password"],
    minlength: 8,
  },
  confirmPassword: {
    type: "String",
    required: [true, "User must have a confirm password"],
    validate: {
      validator: function (el) {
        return this.password === el;
      },
      message: "Confirm password must match.",
    },
  },
  passwordChangedAt: Date,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.confirmPassword = undefined;
});
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.validatePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
const User = mongoose.model("User", userSchema);

module.exports = User;
