const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authController = require("../controllers/authController");

router.use(authController.protect);

router.route("/").get(chatController.fetchChats);

router.post("/group", chatController.createGroupChat);
router.put("/rename", chatController.renameGroup);
router.put("/groupadd", chatController.addToGroup);
router.put("/groupremove", chatController.removeFromGroup);

module.exports = router;
