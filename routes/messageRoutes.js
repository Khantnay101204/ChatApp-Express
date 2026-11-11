const express = require("express");
const router = express.Router();
const messageController = require("./../controllers/messageController");
const authController = require("./../controllers/authController");

router.use(authController.protect);

router.route("/").post(messageController.createMessage);

router.route("/:chatId").get(messageController.getChatMessages);

router
  .route("/single/:id")
  .get(messageController.getMessage)
  .patch(messageController.editMessage);

module.exports = router;
