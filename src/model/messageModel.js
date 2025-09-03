import mongoose, { Schema } from "mongoose";
const messageSchema = mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  updated: {
    type: Boolean,
    default: false,
  },
});

const Msg = mongoose.model("Msg", messageSchema);
export default Msg;
