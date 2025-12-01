import express from "express";
// ──────────────────────────────────────────────────────────────
//  BauLogPro API Server - Hauptdatei
// ──────────────────────────────────────────────────────────────

// ========== Imports & Initialisierung ==========
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

// JWT Secret aus Umgebungsvariablen
const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-key-for-development";

// App initialisieren
const app = express();
export default app;

// ========== Express App Setup ==========
app.use(express.json());

// Hauptfunktion für Server-Setup
export async function setupServer() {
  try {
    console.log("🚀 Starte BauLogPro API Server...");

    // Dynamische Pfadauflösung für lokale und Coolify-Umgebung
    let __filename, __dirname;

    // Sichere Behandlung von import.meta für Jest-Tests
    try {
      __filename = fileURLToPath(import.meta.url);
      __dirname = path.dirname(__filename);
    } catch (e) {
      // Fallback für Jest-Tests oder andere Umgebungen ohne import.meta
      console.log("⚠️ import.meta nicht verfügbar, verwende Fallback");
      __dirname = process.cwd();
      __filename = path.join(__dirname, "server.js");
    }

    console.log("🔧 Aktuelles Verzeichnis:", __dirname);

    // Versuche relativen Import
    let config, query;
    try {
      console.log("📦 Lade Module mit relativen Pfaden...");
      const configModule = await import("../config/index.js");
      const queryModule = await import("../databases/postgres.js");
      config = configModule.config;
      query = queryModule.query;
      console.log("✅ Module erfolgreich geladen");
    } catch (relativeError) {
      console.log("❌ Relativer Import fehlgeschlagen:", relativeError.message);
      console.log("📁 Versuche absoluten Import...");

      // Prüfe ob wir in Docker/Coolify-Umgebung sind
      const isDocker = __dirname.startsWith("/app");
      let configPath, dbPath;

      if (isDocker) {
        // Coolify/Docker-Umgebung: Pfade relativ zu /app
        configPath = path.resolve(
          "/app",
          "src",
          "backend",
          "server",
          "config",
          "index.js"
        );
        dbPath = path.resolve(
          "/app",
          "src",
          "backend",
          "server",
          "databases",
          "postgres.js"
        );
        console.log("🐳 Docker-Umgebung erkannt");
      } else {
        // Lokale Umgebung: Pfade relativ zum aktuellen Verzeichnis
        configPath = path.resolve(__dirname, "..", "config", "index.js");
        dbPath = path.resolve(__dirname, "..", "databases", "postgres.js");
        console.log("💻 Lokale Umgebung erkannt");
      }

      console.log("🔧 Config-Pfad:", configPath);
      console.log("🔧 DB-Pfad:", dbPath);
      console.log("🔧 DB-Pfad:", dbPath);

      const configModule = await import(configPath);
      const queryModule = await import(dbPath);
      config = configModule.config;
      query = queryModule.query;
      console.log("✅ Module mit absoluten Pfaden geladen");
    }

    // ============================
    // ========== Status ==========
    // ============================

    app.get("/api/status", async (req, res) => {
      try {
        // ========== Status-Route ==========
        // Gibt den aktuellen Status und die DB-Zeit zurück
        const dbCheck = await query("SELECT NOW()");
        res.json({
          status: "ok",
          dbTime: dbCheck.rows[0].now,
          apiBaseUrl: config.api.baseUrl,
          env: process.env.NODE_ENV,
          server: {
            host: config.api.host,
            port: config.api.port,
            protocol: config.api.protocol,
          },
          database: {
            host: config.postgres.host || "?",
            port: config.postgres.port || "?",
            name: config.postgres.database || "?",
            user: config.postgres.user || "?",
          },
        });
      } catch (error) {
        console.error("❌ Status-Route Fehler:", error);
        res.status(500).json({
          status: "error",
          message: error.message,
        });
      }
    });

    // ============================
    // ========== login ==========
    // ============================

    app.post("/api/login", async (req, res) => {
      const { email, password } = req.body;

      console.log("🔐 Login-Versuch für:", email);

      // Validierung
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "E-Mail und Passwort sind erforderlich" });
      }

      try {
        // Benutzer aus Datenbank laden
        const result = await query(
          "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
          [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
          console.log("❌ Benutzer nicht gefunden:", email);
          return res
            .status(401)
            .json({ error: "E-Mail oder Passwort ist falsch" });
        }

        const user = result.rows[0];

        // Passwort prüfen
        const passwordMatch = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!passwordMatch) {
          console.log("❌ Falsches Passwort für:", email);
          return res
            .status(401)
            .json({ error: "E-Mail oder Passwort ist falsch" });
        }

        // JWT Token erstellen
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        console.log("✅ Login erfolgreich für:", email);

        res.json({
          message: "Login erfolgreich",
          token: token,
          user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
          },
        });
      } catch (error) {
        console.error("❌ Login-Fehler:", error);
        res.status(500).json({
          error: "Serverfehler beim Login",
          details: error.message,
          stack: error.stack,
        });
      }
    });

    // Starte Server nur beim direkten Aufruf
    const isDirectRun =
      process.argv[1] && path.resolve(process.argv[1]) === __filename;

    if (isDirectRun || process.env.NODE_ENV !== "test") {
      const port = config.api.port || 3000;
      const host = config.api.host || "0.0.0.0";

      app.listen(port, host, async () => {
        console.log(
          `Server läuft auf ${config.api.protocol || "http"}://${host}:${port}`
        );

        // Schöne Konsolenausgabe
        const ipLine = `🖧 Server-IP: ${host}`;
        const portLine = `🔌 Server-Port: ${port}`;
        const modeLine = `🛠️ Modus: ${
          process.env.NODE_ENV === "development" ? "Entwicklung" : "Produktion"
        }`;
        const border = "═".repeat(
          Math.max(ipLine.length, portLine.length, modeLine.length, 40)
        );

        console.log(`\n╔${border}╗`);
        console.log(`║ ${ipLine.padEnd(border.length)} ║`);
        console.log(`║ ${portLine.padEnd(border.length)} ║`);
        console.log(`║ ${modeLine.padEnd(border.length)} ║`);
        console.log(`╚${border}╝\n`);

        // Datenbank-Status
        try {
          const dbCheck = await query("SELECT NOW()");
          const dbBorder = "═".repeat(50);
          console.log(`╔${dbBorder}╗`);
          console.log(
            `║   📦 Datenbank-Status: Verbunden`.padEnd(dbBorder.length + 2) +
              "║"
          );
          console.log(
            `║   Zeit: ${dbCheck.rows[0].now}`.padEnd(dbBorder.length + 2) + "║"
          );
          console.log(`╚${dbBorder}╝\n`);
        } catch (dbError) {
          console.error(
            "❌ Datenbankverbindung fehlgeschlagen:",
            dbError.message
          );
        }
      });
    }
  } catch (error) {
    console.error("❌ Server-Setup fehlgeschlagen:", error);

    // In Test-Umgebung nicht beenden
    if (process.env.NODE_ENV !== "test" && typeof jest === "undefined") {
      process.exit(1);
    } else {
      throw error; // In Tests den Fehler werfen statt exit
    }
  }
}

// Server setup ausführen (nur wenn nicht in Tests)
if (process.env.NODE_ENV !== "test" && typeof jest === "undefined") {
  setupServer();
}
