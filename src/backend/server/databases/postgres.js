import pkg from "pg";
import { config } from "../config/index.js";

const { Pool } = pkg;

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
});

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function testConnection() {
  try {
    const res = await query("SELECT NOW()");
    console.log("PostgreSQL verbunden:", res.rows[0].now);
  } catch (err) {
    console.error("DB Fehler:", err.message);
  }
}
