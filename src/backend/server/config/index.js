import dotenv from "dotenv";
dotenv.config(); // lädt .env im Projekt-Root

export const config = {
  api: {
    baseUrl: process.env.API_BASE_URL,
    protocol: process.env.API_PROTOCOL,
    host: process.env.API_HOST,
    port: Number(process.env.API_PORT),
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === "true",
  },

  postgres: {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  },

  nodeEnv: process.env.NODE_ENV || "development",
};
