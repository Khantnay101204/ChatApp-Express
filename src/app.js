import express, { json } from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import AppError from "./utils/appError.js";
import errorController from "./controller/errorController.js";

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/messages", messageRoutes);

app.use(/.*/, (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not Found`, 404));
});

app.use(errorController);

export default app;
