import Msg from "../model/messageModel.js";
import asyncCatcher from "../utils/asyncCatcher.js";

export const getMsges = asyncCatcher(async (req, res, next) => {
  const messages = await Msg.find();
  res.status(200).json({
    status: "success",
    data: {
      messages,
    },
  });
});

export const createMsg = asyncCatcher(async (req, res, next) => {
  const newMessage = await Msg.create(req.body);
  res.status(201).json({
    status: "success",
    data: {
      messages: newMessage,
    },
  });
});

export const deleteMsg = async (req, res) => {
  try {
    await Msg.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

export const updateMsg = async (req, res) => {
  try {
    const updatedMessage = await Msg.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      data: {
        message: updatedMessage,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};
