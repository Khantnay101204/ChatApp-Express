const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes.js");
const messageRoutes = require("./routes/messageRoutes.js");
const AppError = require("./utils/appError.js");
const errorController = require("./controllers/errorController.js");
const morgan = require("morgan");
const app = express();
app.use(morgan("dev"));

app.use(express.json());
app.use(cors());

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/messages", messageRoutes);

app.use(/.*/, (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not Found`, 404));
});

app.use(errorController);

module.exports = app;
