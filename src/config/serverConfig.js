import dotenv from "dotenv";
dotenv.config();

export const serverConfig = {
  name: process.env.APP_Name,
  port: process.env.PORT,
};
