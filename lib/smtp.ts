import nodemailer from "nodemailer";
import { env } from "./env";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true, 
  maxConnections: 5, 
  maxMessages: 100,
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, 
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});
