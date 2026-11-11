const express = require("express");
const router = express.Router();
const authController = require("./../controllers/authController");
const userController = require("./../controllers/userController");

// 1. Unprotected Public Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// 2. Authentication Middleware Guard (Sets req.user from JWT token)
router.use(authController.protect);

// 3. Protected Routes
router.get("/", userController.searchUsers);
router.route("/:id/username").get(userController.getUsernameById);

module.exports = router;
