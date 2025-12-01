import pkg from "pg";
import { config } from "../config/index.js";

const { Pool } = pkg;

// Dynamische Datenbankverbindung basierend auf Umgebung
export function dynamicDbPoolMiddleware(req, res, next) {
  // Erstelle einen neuen Pool für jeden Request (kann später optimiert werden)
  const dbPool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  req.dbPool = dbPool;

  // Cleanup nach Response
  res.on("finish", () => {
    dbPool.end();
  });

  next();
}
