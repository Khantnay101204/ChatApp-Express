import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";
dotenv.config({ path: "./config.env" });

mongoose
  .connect(process.env.DATABASE)
  .then(console.log("DB connection successful"));

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`App running on port `, PORT);
});
