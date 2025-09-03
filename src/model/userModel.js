import mongoose from "mongoose";
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "User must have a username."],
    unique: true,
  },
  email: {
    type: String,
    required: [true, "User must have an email."],
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  profilePicture: {
    type: String,
    default:
      "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.vecteezy.com%2Ffree-vector%2Fdefault-user&psig=AOvVaw1-EvHjakyMonUbLcndDBT5&ust=1756974822749000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCLDKrrOXvI8DFQAAAAAdAAAAABAE",
  },
});

const User = mongoose.model("User", userSchema);

export default User;
