import express, { json } from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/v1/users", userRoutes);
export default app;
