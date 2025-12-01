import nodemailer from "nodemailer";
import { config } from "../config/index.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendMail({ to, subject, text, html }) {
  return await transporter.sendMail({
    from: config.smtp.user,
    to,
    subject,
    text,
    html,
  });
}
