// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ BauLogPro - Externer Authentifizierungs- und User-API-Server           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// =========================
//   IMPORTS & INITIALISIERUNG

// Lädt Umgebungsvariablen aus .env// =========================
const path = require("path");
const envPath = path.resolve(__dirname, "../../../../.env");
const dotenvResult = require("dotenv").config({ path: envPath });

console.log(
  "═══════════════════════════════════════════════════════════════════"
);
console.log("🌱 .env geladen aus:", envPath);
if (dotenvResult.error) {
  console.error("❌ Fehler beim Laden der .env:", dotenvResult.error);
} else {
  console.log("✅ .env erfolgreich geladen.");
}
console.log("Alle geladenen Umgebungsvariablen:");
Object.keys(process.env)
  .filter(
    (key) =>
      key.startsWith("API_") ||
      key.startsWith("PG") ||
      key.startsWith("SMTP") ||
      key === "NODE_ENV" ||
      key === "LOCAL_DEV"
  )
  .forEach((key) => {
    console.log(`  ${key} = ${process.env[key]}`);
  });
console.log(
  "═══════════════════════════════════════════════════════════════════"
);

// Lokale Entwicklungsfunktion: Setzt Defaults für lokale Entwicklung
function enableLocalDevDefaults() {
  //  const isLocal = process.env.NODE_ENV === "development" || process.env.LOCAL_DEV === "true";
  const isLocal = process.env.LOCAL_DEV === "true";

  if (isLocal) {
    // Lokale Werte aus .env verwenden
    process.env.API_HOST = process.env.API_LOCAL_HOST || "localhost";
    process.env.API_PORT = process.env.API_LOCAL_PORT || "3000";
    process.env.PGHOST = process.env.PG_LOCAL_HOST || "localhost";
    process.env.PGPORT = process.env.PG_LOCAL_PORT || "5432";
    process.env.PGDATABASE = process.env.PG_LOCAL_DATABASE || "baulogpro";
    process.env.PGUSER = process.env.PG_LOCAL_USER || "postgres";
    process.env.PGPASSWORD = process.env.PG_LOCAL_PASSWORD || "postgres";
    process.env.SMTP_HOST = process.env.SMTP_LOCAL_HOST || "localhost";
    process.env.SMTP_PORT = process.env.SMTP_LOCAL_PORT || "1025";
    process.env.SMTP_USER = process.env.SMTP_LOCAL_USER || "";
    process.env.SMTP_PASS = process.env.SMTP_LOCAL_PASS || "";
    process.env.SMTP_SECURE = process.env.SMTP_LOCAL_SECURE || "false";
    process.env.SSL_KEY_PATH = "";
    process.env.SSL_CERT_PATH = "";
    console.log(
      "🌍 Lokaler Entwicklungsmodus aktiv: Lokale Werte aus .env gesetzt"
    );
  } else {
    // Produktivwerte aus .env verwenden
    process.env.API_HOST = process.env.API_PROD_HOST || "api.cloudforming.de";
    process.env.API_PORT = process.env.API_PROD_PORT || "3000";
    process.env.PGHOST = process.env.PG_PROD_HOST || "api.cloudforming.de";
    process.env.PGPORT = process.env.PG_PROD_PORT || "5433";
    process.env.PGDATABASE = process.env.PG_PROD_DATABASE || "baulogpro";
    process.env.PGUSER = process.env.PG_PROD_USER || "postgres";
    process.env.PGPASSWORD = process.env.PG_PROD_PASSWORD || "";
    process.env.SMTP_HOST = process.env.SMTP_PROD_HOST || "smtp.gmail.com";
    process.env.SMTP_PORT = process.env.SMTP_PROD_PORT || "587";
    process.env.SMTP_USER =
      process.env.SMTP_PROD_USER || "cloudformingbusiness@gmail.com";
    process.env.SMTP_PASS = process.env.SMTP_PROD_PASS || "";
    process.env.SMTP_SECURE = process.env.SMTP_PROD_SECURE || "false";
    // Zertifikate aus .env oder Standard
    // (keine Änderung nötig)
    console.log("🌍 Produktivmodus aktiv: Produktivwerte aus .env gesetzt");
  }
}

enableLocalDevDefaults();

// Express & Third-Party Libraries
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Haupt-App-Objekt
const app = express();

// =========================
//   MIDDLEWARE
// =========================

// CORS-Middleware für Web und Mobile
app.use(cors());

app.use(express.urlencoded({ extended: true })); // Für Formulardaten
app.use(express.json()); // Für JSON-Daten

// CORS-Middleware für Web und Mobile
/* app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-db-host, x-db-port, x-db-name, x-db-user, x-db-password"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
}); */

// =========================
//   KONSTANTEN & KONFIGURATION
// =========================

const PORT = process.env.API_PORT || 3000;
const HOST = process.env.API_HOST || "0.0.0.0"; // Aus .env, sonst lokal
const JWT_SECRET = "DEIN_SUPER_GEHEIMER_JWT_SECRET_KEY_HIER_ÄNDERN"; // ⚠️ IN PRODUKTION ÄNDERN!
const SALT_ROUNDS = 10;

// PostgreSQL Verbindung & Validierung (FALLBACK-KONFIGURATION)
const fallbackPoolConfig = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
};

// Dummy-Token-Speicher für Passwort-Reset (in Produktion in DB speichern!)
const resetTokens = {};

// ───────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ───────────────────────────────────────────────────────────────────────────

// Middleware zur dynamischen Erstellung des DB-Pools pro Request
const dynamicDbPoolMiddleware = (req, res, next) => {
  const config = {
    host: req.headers["x-db-host"] || fallbackPoolConfig.host,
    port: req.headers["x-db-port"] || fallbackPoolConfig.port,
    database: req.headers["x-db-name"] || fallbackPoolConfig.database,
    user: req.headers["x-db-user"] || fallbackPoolConfig.user,
    password: req.headers["x-db-password"] || fallbackPoolConfig.password,
    // Kurzer Timeout, um bei falschen Credentials schnell zu scheitern
    connectionTimeoutMillis: 5000,
  };

  // Prüfen, ob eine Konfiguration vorhanden ist
  if (!config.host || !config.port || !config.database || !config.user) {
    console.error("❌ Incomplete database configuration for request.", {
      path: req.path,
      host: !!config.host,
      user: !!config.user,
    });
    return res.status(400).json({
      error:
        "Datenbank-Konfiguration unvollständig. Bitte stellen Sie sicher, dass die App-Einstellungen korrekt sind oder die Server .env-Datei vollständig ist.",
    });
  }

  req.dbPool = new Pool(config);
  next();
};

// Request-Logging
app.use((req, res, next) => {
  console.log(
    `📨 ${req.method} ${req.path} - ${new Date().toLocaleString("de-DE")}`
  );
  next();
});

// ───────────────────────────────────────────────────────────────────────────
// FEHLERBEHANDLUNG: Uncaught Exceptions
// ───────────────────────────────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
// ───────────────────────────────────────────────────────────────────────────
// ROUTES
// ───────────────────────────────────────────────────────────────────────────

// Passwort zurücksetzen: GET /api/reset-password
app.get("/api/reset-password", (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) {
    return res.status(400).send("Ungültiger Link.");
  }
  // Token-Prüfung (Dummy, in Produktion aus DB holen)
  if (!resetTokens[email] || resetTokens[email] !== token) {
    return res.status(400).send("Ungültiger oder abgelaufener Token.");
  }
  // Einfache HTML-Seite für neues Passwort
  res.send(`
    <html>
      <head><title>Passwort zurücksetzen</title></head>
      <body>
        <h2>Passwort zurücksetzen für ${email}</h2>
        <form method="POST" action="/reset-password">
          <input type="hidden" name="email" value="${email}" />
          <input type="hidden" name="token" value="${token}" />
          <label>Neues Passwort:<br><input type="password" name="password" required /></label><br><br>
          <button type="submit">Passwort setzen</button>
        </form>
      </body>
    </html>
  `);
});

// Passwort zurücksetzen: POST /api/reset-password
app.post("/api/reset-password", dynamicDbPoolMiddleware, async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: "Fehlende Daten." });
  }
  if (!resetTokens[email] || resetTokens[email] !== token) {
    return res
      .status(400)
      .json({ error: "Ungültiger oder abgelaufener Token." });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Passwort muss mindestens 6 Zeichen lang sein." });
  }
  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await req.dbPool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [passwordHash, email.toLowerCase()]
    );
    // Token löschen
    delete resetTokens[email];
    res.send("Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.");
  } catch (err) {
    console.error("Fehler beim Passwort-Reset:", err);
    res.status(500).json({
      error: "Fehler beim Passwort-Reset.",
      details: err.message,
      stack: err.stack,
    });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});
// Datenbankverbindung testen
const fallbackPool = new Pool(fallbackPoolConfig);
fallbackPool.connect((err, client, release) => {
  if (err) {
    console.error(
      "❌ Fehler bei der initialen Fallback-Datenbankverbindung:",
      err.stack
    );
  } else {
    // Nur im normalen Betrieb loggen, nicht im Test (Jest)
    if (process.env.JEST_WORKER_ID === undefined) {
      console.log("✅ Fallback-Datenbankverbindung erfolgreich");
    }
    release();
  }
});

// (Middleware und Logging siehe oben)

// Authentifizierungs-Middleware für geschützte Routen
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Kein Token vorhanden" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ Token-Verifizierung fehlgeschlagen:", err.message);
      return res.status(403).json({ error: "Token ungültig oder abgelaufen" });
    }
    req.user = user;
    next();
  });
};

// Root-Route
app.get("/", (req, res) => {
  res.json({
    message: "🏗️ BauLogPro API Server",
    version: "1.1.0",
    endpoints: {
      register: "POST /api/register",
      login: "POST /api/login",
      user: "GET /api/user (authentifiziert)",
      protected: "GET /protected (authentifiziert)",
    },
  });
});

// Status-Endpoint für Health-Checks
app.get("/api/status", async (req, res) => {
  // Speicher und Uptime
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  // Datenbank-Check mit Fehlerdetails
  let dbStatus = "unknown";
  let dbError = null;
  try {
    await fallbackPool.query("SELECT 1");
    dbStatus = "connected";
  } catch (e) {
    dbStatus = "error";
    dbError = {
      message: e.message,
      code: e.code,
      detail: e.detail,
      stack: e.stack,
    };
  }

  res.json({
    status: "ok",
    time: new Date().toISOString(),
    version: "1.0.0",
    node: process.version,
    port: PORT,
    host: HOST,
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    db: dbStatus,
    dbError,
    env: process.env.NODE_ENV || "development",
    info: "ich bin der externe Server",
    process: {
      name: process.title,
      pid: process.pid,
    },
  });
});

// Registrierung
app.post("/api/register", dynamicDbPoolMiddleware, async (req, res) => {
  const { email, password } = req.body;

  console.log("📝 Registrierungsversuch für:", email);

  // Validierung
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "E-Mail und Passwort sind erforderlich" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Passwort muss mindestens 6 Zeichen lang sein" });
  }

  // E-Mail-Format prüfen
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Ungültige E-Mail-Adresse" });
  }

  try {
    // Prüfen ob E-Mail bereits existiert
    const existingUser = await req.dbPool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      console.log("⚠️ E-Mail bereits registriert:", email);
      return res
        .status(409)
        .json({ error: "Diese E-Mail-Adresse ist bereits registriert" });
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Benutzer in Datenbank speichern
    const result = await req.dbPool.query(
      "INSERT INTO users (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email, created_at",
      [email.toLowerCase(), passwordHash]
    );

    const newUser = result.rows[0];
    console.log("✅ Neuer Benutzer registriert:", newUser.email);

    res.status(201).json({
      message: "Registrierung erfolgreich",
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error("❌ Registrierungsfehler:", error);
    res.status(500).json({
      error: "Serverfehler bei der Registrierung",
      details: error.message,
      stack: error.stack,
    });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// Login
app.post("/api/login", dynamicDbPoolMiddleware, async (req, res) => {
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
    const result = await req.dbPool.query(
      "SELECT id, email, password_hash, created_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log("❌ Benutzer nicht gefunden:", email);
      return res.status(401).json({ error: "E-Mail oder Passwort ist falsch" });
    }

    const user = result.rows[0];

    // Passwort prüfen
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      console.log("❌ Falsches Passwort für:", email);
      return res.status(401).json({ error: "E-Mail oder Passwort ist falsch" });
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
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// Passwort vergessen / Reset
app.post("/api/forgot-password", dynamicDbPoolMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Ungültige E-Mail-Adresse." });
  }

  try {
    // Prüfen ob E-Mail existiert
    const result = await req.dbPool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "E-Mail nicht gefunden." });
    }
    const user = result.rows[0];

    // Token generieren und speichern
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens[email] = token;

    // E-Mail-Versand vorbereiten
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetLink = `https://${HOST}/reset-password?token=${token}&email=${encodeURIComponent(
      email
    )}`;
    const mailOptions = {
      from: "noreply@baulogpro.de",
      to: email,
      subject: "Passwort zurücksetzen",
      text: `Hallo,\n\nKlicke auf den folgenden Link, um dein Passwort zurückzusetzen:\n${resetLink}\n\nFalls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.`,
    };

    await transporter.sendMail(mailOptions);
    return res.json({
      message: "Eine E-Mail zum Zurücksetzen des Passworts wurde versendet.",
    });
  } catch (err) {
    console.error("E-Mail Fehler:", err.message, err.response, err);
    return res
      .status(500)
      .json({ error: "E-Mail konnte nicht versendet werden." });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});
// ───────────────────────────────────────────────────────────────────────────

// Benutzerinformationen abrufen (geschützt)
app.get(
  "/api/user",
  authenticateToken,
  dynamicDbPoolMiddleware,
  async (req, res) => {
    try {
      const result = await req.dbPool.query(
        "SELECT id, email, created_at FROM users WHERE id = $1",
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
      }

      res.json({
        user: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Fehler beim Abrufen der Benutzerdaten:", error);
      res.status(500).json({
        error: "Serverfehler",
        details: error.message,
        stack: error.stack,
      });
    } finally {
      if (req.dbPool) req.dbPool.end();
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────
// GESCHÜTZTE BEISPIEL-ROUTE
// ───────────────────────────────────────────────────────────────────────────

// Beispiel für geschützte Route
app.get("/protected", authenticateToken, (req, res) => {
  res.json({
    message: "🔒 Dies ist eine geschützte Route",
    user: req.user,
  });
});

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API ROUTEN
// (Alle Routen, die mit /api/projekte, /api/fotos etc. zu tun haben)
// ───────────────────────────────────────────────────────────────────────────

app.get("/api/projekte", dynamicDbPoolMiddleware, async (req, res) => {
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM projekte ORDER BY erstellt_am DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Projekte" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.get("/api/projekte/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM projekte WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Projekt nicht gefunden" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden des Projekts" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.post("/api/projekte", dynamicDbPoolMiddleware, async (req, res) => {
  // Daten aus dem verschachtelten "stammdaten"-Objekt extrahieren
  const {
    id,
    projektName,
    projektBeschreibung,
    status,
    strasse,
    hausnummer,
    plz,
    ort,
    latitude,
    longitude,
    personalId,
    createdAt,
  } = req.body.stammdaten;

  // Fallback für Felder, die in der alten Struktur anders hießen
  const name = projektName;
  const beschreibung = projektBeschreibung;
  const gps_koordinaten =
    latitude && longitude ? `${latitude},${longitude}` : null;
  const ersteller = personalId;

  try {
    const result = await req.dbPool.query(
      `INSERT INTO projekte (id, name, beschreibung, status, ort, plz, strasse, ersteller, gps_koordinaten, erstellt_am, aktualisiert_am)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id,
        name,
        beschreibung,
        status,
        ort,
        plz,
        strasse,
        ersteller,
        gps_koordinaten,
        createdAt || new Date(),
        new Date(),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Fehler beim Erstellen des Projekts:", err);
    res.status(500).json({
      error: "Fehler beim Erstellen des Projekts",
      details: err.message,
    });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.put("/api/projekte/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;

  // Loggen des gesamten Request-Bodys zur Fehlersuche
  console.log(
    "🔄 PUT /api/projekte/:id - Empfangener Body:",
    JSON.stringify(req.body, null, 2)
  );

  // VERSUCH 1: Daten direkt aus req.body nehmen (flache Struktur)
  let data = req.body;

  // VERSUCH 2: Prüfen, ob die Daten in req.body.stammdaten verschachtelt sind
  if (req.body.stammdaten) {
    console.log(
      "ℹ️ 'stammdaten'-Objekt gefunden, verwende verschachtelte Daten."
    );
    data = req.body.stammdaten;
  }

  const {
    projektName,
    projektBeschreibung,
    status,
    strasse,
    hausnummer,
    plz,
    ort,
    latitude,
    longitude,
    personalId,
  } = data;

  // Validierung: Sicherstellen, dass zumindest ein Name vorhanden ist
  if (!projektName) {
    console.error("❌ PUT-Fehler: projektName fehlt im Request-Body.", data);
    return res.status(400).json({ error: "Projektname ist ein Pflichtfeld." });
  }

  const name = projektName;
  const beschreibung = projektBeschreibung;
  const gps_koordinaten =
    latitude && longitude ? `${latitude},${longitude}` : null;
  const ersteller = personalId;

  const query = `
    UPDATE projekte SET 
      name = $1, 
      beschreibung = $2, 
      status = $3, 
      ort = $4, 
      plz = $5, 
      strasse = $6, 
      ersteller = $7, 
      gps_koordinaten = $8, 
      aktualisiert_am = NOW() 
    WHERE id = $9 
    RETURNING *`;

  const values = [
    name,
    beschreibung,
    status,
    ort,
    plz,
    strasse,
    ersteller,
    gps_koordinaten,
    id,
  ];

  try {
    console.log("Executing query with values:", values);
    const result = await req.dbPool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Projekt nicht gefunden" });
    }

    console.log("✅ Projekt erfolgreich aktualisiert:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      "❌ Fehler beim Aktualisieren des Projekts in der Datenbank:",
      {
        message: err.message,
        stack: err.stack,
        query: query,
        values: values,
      }
    );
    res.status(500).json({
      error: "Fehler beim Aktualisieren des Projekts",
      details: err.message,
    });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.delete("/api/projekte/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.dbPool.query(
      "DELETE FROM projekte WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Projekt nicht gefunden" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Projekts" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API: Fotos
// ───────────────────────────────────────────────────────────────────────────
app.get("/api/fotos", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id } = req.query;
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM fotos WHERE projekt_id = $1 ORDER BY timestamp DESC",
      [projekt_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Fotos" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.post("/api/fotos", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id, bild, beschreibung, typ } = req.body;
  try {
    const result = await req.dbPool.query(
      `INSERT INTO fotos (projekt_id, bild, beschreibung, typ, timestamp) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [projekt_id, bild, beschreibung, typ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Speichern des Fotos" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.delete("/api/fotos/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.dbPool.query(
      "DELETE FROM fotos WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Foto nicht gefunden" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen des Fotos" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API: Messdaten
// ───────────────────────────────────────────────────────────────────────────
app.get("/api/messdaten", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id } = req.query;
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM messdaten WHERE projekt_id = $1 ORDER BY timestamp DESC",
      [projekt_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Messdaten" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.post("/api/messdaten", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id, wert, einheit, beschreibung } = req.body;
  try {
    const result = await req.dbPool.query(
      `INSERT INTO messdaten (projekt_id, wert, einheit, beschreibung, timestamp) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [projekt_id, wert, einheit, beschreibung]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Speichern der Messdaten" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.delete("/api/messdaten/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.dbPool.query(
      "DELETE FROM messdaten WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Messdaten nicht gefunden" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen der Messdaten" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API: Sicherheit
// ───────────────────────────────────────────────────────────────────────────
app.get("/api/sicherheit", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id } = req.query;
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM sicherheit WHERE projekt_id = $1 ORDER BY timestamp DESC",
      [projekt_id]
    );
    res.json(result.rows);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Fehler beim Laden der Sicherheitsmaßnahmen" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.post("/api/sicherheit", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id, massnahme, status, bemerkung } = req.body;
  try {
    const result = await req.dbPool.query(
      `INSERT INTO sicherheit (projekt_id, massnahme, status, bemerkung, timestamp) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [projekt_id, massnahme, status, bemerkung]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Fehler beim Speichern der Sicherheitsmaßnahme" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.delete("/api/sicherheit/:id", dynamicDbPoolMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.dbPool.query(
      "DELETE FROM sicherheit WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Sicherheitsmaßnahme nicht gefunden" });
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Fehler beim Löschen der Sicherheitsmaßnahme" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API: Kalkulation
// ───────────────────────────────────────────────────────────────────────────
app.get("/api/kalkulation", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id } = req.query;
  try {
    const result = await req.dbPool.query(
      "SELECT * FROM kalkulation WHERE projekt_id = $1 ORDER BY timestamp DESC",
      [projekt_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Kalkulation" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.post("/api/kalkulation", dynamicDbPoolMiddleware, async (req, res) => {
  const { projekt_id, position, betrag, beschreibung } = req.body;
  try {
    const result = await req.dbPool.query(
      `INSERT INTO kalkulation (projekt_id, position, betrag, beschreibung, timestamp) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [projekt_id, position, betrag, beschreibung]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Speichern der Kalkulation" });
  } finally {
    if (req.dbPool) req.dbPool.end();
  }
});

app.delete(
  "/api/kalkulation/:id",
  dynamicDbPoolMiddleware,
  async (req, res) => {
    const { id } = req.params;
    try {
      const result = await req.dbPool.query(
        "DELETE FROM kalkulation WHERE id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Kalkulation nicht gefunden" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Löschen der Kalkulation" });
    } finally {
      if (req.dbPool) req.dbPool.end();
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────
// PROJEKT-API: Sammel-Speichern für Projekt und Untertabellen
// ───────────────────────────────────────────────────────────────────────────
app.put(
  "/api/projekt-komplett/:id",
  dynamicDbPoolMiddleware,
  async (req, res) => {
    const { id } = req.params;
    const { projekt, fotos, messdaten, sicherheit, kalkulation } = req.body;
    const client = await req.dbPool.connect();
    try {
      await client.query("BEGIN");
      // Projekt aktualisieren
      await client.query(
        `UPDATE projekte SET name=$1, beschreibung=$2, kunde=$3, projektleiter=$4, startdatum=$5, enddatum=$6, status=$7, budget=$8, ort=$9, plz=$10, strasse=$11, land=$12, kontakt_email=$13, kontakt_telefon=$14, ersteller=$15, notizen=$16, dokumente=$17, gps_koordinaten=$18, aktualisiert_am=NOW() WHERE id=$19`,
        [
          projekt.name,
          projekt.beschreibung,
          projekt.kunde,
          projekt.projektleiter,
          projekt.startdatum,
          projekt.enddatum,
          projekt.status,
          projekt.budget,
          projekt.ort,
          projekt.plz,
          projekt.strasse,
          projekt.land,
          projekt.kontakt_email,
          projekt.kontakt_telefon,
          projekt.ersteller,
          projekt.notizen,
          projekt.dokumente,
          projekt.gps_koordinaten,
          id,
        ]
      );
      // Fotos aktualisieren (nur neue/aktualisierte, keine Löschungen)
      for (const foto of fotos || []) {
        if (foto.id) {
          await client.query(
            `UPDATE fotos SET bild=$1, beschreibung=$2, typ=$3, timestamp=NOW() WHERE id=$4 AND projekt_id=$5`,
            [foto.bild, foto.beschreibung, foto.typ, foto.id, id]
          );
        } else {
          await client.query(
            `INSERT INTO fotos (projekt_id, bild, beschreibung, typ, timestamp) VALUES ($1,$2,$3,$4,NOW())`,
            [id, foto.bild, foto.beschreibung, foto.typ]
          );
        }
      }
      // Messdaten aktualisieren
      for (const md of messdaten || []) {
        if (md.id) {
          await client.query(
            `UPDATE messdaten SET wert=$1, einheit=$2, beschreibung=$3, timestamp=NOW() WHERE id=$4 AND projekt_id=$5`,
            [md.wert, md.einheit, md.beschreibung, md.id, id]
          );
        } else {
          await client.query(
            `INSERT INTO messdaten (projekt_id, wert, einheit, beschreibung, timestamp) VALUES ($1,$2,$3,$4,NOW())`,
            [id, md.wert, md.einheit, md.beschreibung]
          );
        }
      }
      // Sicherheit aktualisieren
      for (const s of sicherheit || []) {
        if (s.id) {
          await client.query(
            `UPDATE sicherheit SET massnahme=$1, status=$2, bemerkung=$3, timestamp=NOW() WHERE id=$4 AND projekt_id=$5`,
            [s.massnahme, s.status, s.bemerkung, s.id, id]
          );
        } else {
          await client.query(
            `INSERT INTO sicherheit (projekt_id, massnahme, status, bemerkung, timestamp) VALUES ($1,$2,$3,$4,NOW())`,
            [id, s.massnahme, s.status, s.bemerkung]
          );
        }
      }
      // Kalkulation aktualisieren
      for (const k of kalkulation || []) {
        if (k.id) {
          await client.query(
            `UPDATE kalkulation SET position=$1, betrag=$2, beschreibung=$3, timestamp=NOW() WHERE id=$4 AND projekt_id=$5`,
            [k.position, k.betrag, k.beschreibung, k.id, id]
          );
        } else {
          await client.query(
            `INSERT INTO kalkulation (projekt_id, position, betrag, beschreibung, timestamp) VALUES ($1,$2,$3,$4,NOW())`,
            [id, k.position, k.betrag, k.beschreibung]
          );
        }
      }
      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res
        .status(500)
        .json({ error: "Fehler beim Sammel-Speichern des Projekts" });
    } finally {
      client.release();
      if (req.dbPool) req.dbPool.end();
    }
  }
);

// NEU: Datenbankverbindung testen
app.post("/api/test-db-connection", async (req, res) => {
  // Parameter aus dem Request-Body extrahieren
  const { host, port, name, user, password } = req.body;

  // Validierung der Parameter
  if (!host || !port || !name || !user) {
    // Passwort kann leer sein, der Rest nicht
    return res
      .status(400)
      .json({ success: false, error: "Fehlende Datenbankparameter." });
  }

  console.log(`🧪 Teste DB-Verbindung zu: ${user}@${host}:${port}/${name}`);

  let testPool;
  try {
    // Einen neuen Pool nur für diesen Test erstellen
    const { Pool } = require("pg");
    testPool = new Pool({
      host: host,
      port: port,
      database: name,
      user: user,
      password: password,
      // Kurzer Timeout, um bei falschen Credentials schnell zu scheitern
      connectionTimeoutMillis: 5000,
    });
  } catch (err) {
    console.error("❌ Fehler beim Erstellen des DB-Pools:", err.message);
    return res.status(500).json({
      success: false,
      error: "Fehler beim Erstellen des DB-Pools",
      details: err.message,
    });
  }

  try {
    // Versuchen, eine Verbindung aufzubauen und eine einfache Abfrage zu senden
    const client = await testPool.connect();
    await client.query("SELECT 1"); // Einfache, schnelle Abfrage
    client.release(); // Verbindung sofort wieder freigeben
    await testPool.end(); // Pool schließen, da er nur für den Test war
    console.log("✅ Verbindungstest erfolgreich.");
    return res.json({ success: true, message: "Verbindung erfolgreich." });
  } catch (err) {
    // Detaillierte Fehlermeldung an den Client senden
    console.error("❌ Verbindungstest fehlgeschlagen:", err.message);
    return res.status(500).json({
      success: false,
      error: "Verbindung fehlgeschlagen",
      details: err.message, // Enthält z.B. "password authentication failed"
    });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// FEHLERBEHANDLUNG (MUSS NACH ALLEN ROUTEN KOMMEN)
// ───────────────────────────────────────────────────────────────────────────
// Allgemeiner Fehler-Handler
app.use((err, req, res, next) => {
  console.error("💥 Unerwarteter Fehler:", err);
  res.status(500).json({ error: "Interner Serverfehler" });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route nicht gefunden" });
});

// ───────────────────────────────────────────────────────────────────────────
// SERVER STARTEN & EXPORT
// ───────────────────────────────────────────────────────────────────────────

// Die app wird für Tests exportiert.
module.exports = { app };

// Der Server wird nur gestartet, wenn die Datei direkt mit `node server.js`
// ausgeführt wird. Dies verhindert, dass der Server beim Import in Testdateien
// automatisch startet, was zu Port-Konflikten (EADDRINUSE) führen würde.
if (require.main === module) {
  const fs = require("fs");
  const path = require("path");
  let server;
  let protocol;
  let effectiveHost;
  let effectivePort;
  const isLocal =
    process.env.NODE_ENV === "development" || process.env.LOCAL_DEV === "true";
  if (isLocal) {
    protocol = process.env.API_LOCAL_PROTOCOL || "http";
    effectiveHost = process.env.API_LOCAL_HOST || "localhost";
    effectivePort = process.env.API_LOCAL_PORT || "3000";
  } else {
    protocol = process.env.API_PROD_PROTOCOL || "https";
    effectiveHost = process.env.API_PROD_HOST || "api.cloudforming.de";
    effectivePort = process.env.API_PROD_PORT || "3000";
  }
  // Zertifikatspfad aus ENV oder Standard
  const keyPath =
    process.env.SSL_KEY_PATH ||
    path.join(__dirname, "../../../certs/server.key");
  const certPath =
    process.env.SSL_CERT_PATH ||
    path.join(__dirname, "../../../certs/server.crt");
  // Dynamische Banner-Ausgabe
  function printBanner({ protocol, host, port }) {
    const serverLine = `🌐 Server läuft auf: ${protocol}://${host}:${port}`;
    const dateLine = `📅 Gestartet: ${new Date().toLocaleString("de-DE")}`;
    // Banner-Breite dynamisch bestimmen
    const contentWidth = Math.max(serverLine.length, dateLine.length, 48);
    const totalWidth = contentWidth + 6; // 3 links/rechts für Rand und Leerzeichen
    const border = "═".repeat(totalWidth - 2);
    function pad(line) {
      return `║  ${line.padEnd(contentWidth)}  ║`;
    }
    console.log(`╔${border}╗`);
    console.log(pad("🏗️  BauLogPro Authentication Server"));
    console.log(`╠${border}╣`);
    console.log(pad(serverLine));
    console.log(pad(dateLine));
    console.log(`╚${border}╝`);
  }

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    try {
      const https = require("https");
      const privateKey = fs.readFileSync(keyPath, "utf8");
      const certificate = fs.readFileSync(certPath, "utf8");
      const credentials = { key: privateKey, cert: certificate };
      server = https
        .createServer(credentials, app)
        .listen(effectivePort, effectiveHost, () => {
          protocol = "https";
          printBanner({ protocol, host: effectiveHost, port: effectivePort });
        });
    } catch (err) {
      console.error("❌ HTTPS-Start fehlgeschlagen, starte HTTP:", err);
    }
  }
  if (!server) {
    server = app.listen(effectivePort, effectiveHost, () => {
      printBanner({ protocol, host: effectiveHost, port: effectivePort });
    });
  }

  // Graceful Shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Server wird heruntergefahren...");
    server.close(() => {
      console.log(`✅ ${protocol.toUpperCase()}-Server geschlossen.`);
      fallbackPool.end().then(() => {
        console.log("✅ Datenbankverbindungen geschlossen.");
        process.exit(0);
      });
    });
  });
}
