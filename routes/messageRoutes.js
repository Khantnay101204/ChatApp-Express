const express = require("express");
const router = express.Router();
const messageController = require("./../controllers/messageController");
const authController = require("./../controllers/authController");

router
  .route("/")
  .post(authController.protect, messageController.createMessage)
  .get(authController.protect, messageController.getAllMessages);
router.route("/:id").get(authController.protect, messageController.getMessage);

module.exports = router;
