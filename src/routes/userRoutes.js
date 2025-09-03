import express from "express";
import {
  createUser,
  getUser,
  getUsers,
} from "../controller/usersController.js";

const router = express.Router();

router.route("/").get(getUsers).post(createUser);

router.route("/:id").get(getUser);

export default router;
