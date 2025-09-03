import express from "express";
import {
  createMsg,
  deleteMsg,
  getMsges,
  updateMsg,
} from "../controller/messagesController.js";
const router = express.Router();

router.route("/").get(getMsges).post(createMsg);
router.route("/:id").delete(deleteMsg).patch(updateMsg);

export default router;
