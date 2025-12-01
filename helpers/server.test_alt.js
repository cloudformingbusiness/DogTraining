// =============================================================================
//  TEST-SUITE FÜR DEN BAULOGPRO API-SERVER
// =============================================================================
//  Diese Datei enthält eine umfassende Test-Suite für die API-Endpunkte,
//  die mit Projekten und zugehörigen Daten interagieren.
//  Frameworks: Jest & Supertest
// =============================================================================

// -----------------------------------------------------------------------------
//  1. IMPORTE UND INITIALISIERUNG
// -----------------------------------------------------------------------------
const path = require("path");

// Lädt die Umgebungsvariablen aus der .env.test-Datei.
// Dies ist entscheidend, um sicherzustellen, dass die Tests gegen eine
// dedizierte Test-Datenbank laufen und keine Produktionsdaten gefährden.
require("dotenv").config({
  path: path.resolve(__dirname, "../../../../.env.test"),
});

const request = require("supertest"); // Zum Senden von HTTP-Anfragen an den Server
const { app } = require("../src/backend/server/controllers/server_alt"); // Die Express-App aus der server.js-Datei
const { Pool } = require("pg"); // PostgreSQL-Client

// -----------------------------------------------------------------------------
//  2. GLOBALE VARIABLEN UND KONFIGURATION
// -----------------------------------------------------------------------------

// Globale Variable für die Server-Instanz.
// Wird in beforeAll() initialisiert und in afterAll() geschlossen.
let server;

// Globale Variable für die Projekt-ID, um sie zwischen den Tests zu teilen.
// Wird im "CREATE"-Test gesetzt und in den "READ", "UPDATE", "DELETE"-Tests verwendet.
let testProjectId;

// Setzt ein höheres Timeout für alle Tests in dieser Datei.
// Nützlich für Tests, die auf Datenbankoperationen oder Server-Antworten warten.
jest.setTimeout(30000); // 30 Sekunden

// -----------------------------------------------------------------------------
//  3. TEST-DATENBANK-KONFIGURATION
// -----------------------------------------------------------------------------
// Erstellt einen neuen Pool für die Test-Datenbank.
// Die Konfiguration wird aus den Umgebungsvariablen (.env.test) geladen.
const testPool = new Pool({
  host: process.env.PGHOST_TEST,
  port: process.env.PGPORT_TEST,
  database: process.env.PGDATABASE_TEST,
  user: process.env.PGUSER_TEST,
  password: process.env.PGPASSWORD_TEST,
});

// Header, die bei jeder Anfrage mitgesendet werden, um die dynamische
// Datenbankverbindung (Multi-Tenancy) auf die Test-Datenbank zu lenken.
const dbHeaders = {
  "x-db-host": process.env.PGHOST_TEST,
  "x-db-port": process.env.PGPORT_TEST,
  "x-db-name": process.env.PGDATABASE_TEST,
  "x-db-user": process.env.PGUSER_TEST,
  "x-db-password": process.env.PGPASSWORD_TEST,
};

// -----------------------------------------------------------------------------
//  4. TEST-DATEN (DUMMY-OBJEKTE)
// -----------------------------------------------------------------------------

// Ein Standard-Projektobjekt für die Tests.
const dummyProject = {
  name: "Test-Projekt Beta",
  beschreibung: "Ein Test-Projekt für die API-Endpunkte.",
  kunde: "Max Mustermann",
  projektleiter: "Erika Mustermann",
  startdatum: "2025-01-01",
  enddatum: "2025-12-31",
  status: "geplant",
  budget: 20000.0,
  ort: "Teststadt",
  plz: "12345",
  strasse: "Testweg 1",
  land: "DE",
  kontakt_email: "test@example.com",
  kontakt_telefon: "0123456789",
  ersteller: "System-Test",
  notizen: "Keine besonderen Notizen.",
  dokumente: JSON.stringify([{ name: "plan.pdf", url: "/docs/plan.pdf" }]),
  gps_koordinaten: "52.5200, 13.4050",
};

// Ein umfassendes Objekt für den "Komplett-Update"-Test, das auch Daten
// für die Untertabellen (Fotos, Messdaten etc.) enthält.
const dummyProjektKomplett = {
  projekt: {
    ...dummyProject,
    name: "Test-Projekt Alpha (Aktualisiert)",
    status: "in_bearbeitung",
  },
  fotos: [
    {
      bild: Buffer.from("fake-image-data").toString("base64"),
      beschreibung: "Foto vom Fundament",
      typ: "fundament",
    },
  ],
  messdaten: [{ wert: 12.5, einheit: "°C", beschreibung: "Außentemperatur" }],
  sicherheit: [
    {
      massnahme: "Helm tragen",
      status: "aktiv",
      bemerkung: "Auf der gesamten Baustelle Pflicht",
    },
  ],
  kalkulation: [
    {
      position: "Materialkosten",
      betrag: 5000.0,
      beschreibung: "Beton und Stahl",
    },
  ],
};

// =============================================================================
//  5. TEST-SUITE: PROJEKT API ENDPUNKTE (/api/projekte)
// =============================================================================
describe("DB-Server - Projekt API Endpunkte (/api/projekte)", () => {
  // ---------------------------------------------------------------------------
  //  HOOKS: Code, der vor oder nach den Tests ausgeführt wird
  // ---------------------------------------------------------------------------

  /**
   * `beforeAll` wird EINMAL vor allen Tests in dieser `describe`-Suite ausgeführt.
   * - Startet den Express-Server auf einem zufälligen, freien Port.
   * - Leert alle relevanten Tabellen in der Test-Datenbank, um einen sauberen
   *   Start zu gewährleisten.
   * - Gibt ein Promise zurück, damit Jest weiß, wann das Setup abgeschlossen ist.
   */
  beforeAll(() => {
    return new Promise((resolve) => {
      server = app.listen(0, async () => {
        const client = await testPool.connect();
        try {
          await client.query("DELETE FROM kalkulation");
          await client.query("DELETE FROM sicherheit");
          await client.query("DELETE FROM messdaten");
          await client.query("DELETE FROM fotos");
          await client.query("DELETE FROM projekte");
        } finally {
          client.release();
        }
        resolve();
      });
    });
  });

  /**
   * `afterAll` wird EINMAL nach allen Tests in dieser `describe`-Suite ausgeführt.
   * - Schließt die Server-Verbindung, um "offene Handles" in Jest zu vermeiden.
   * - Schließt den Datenbank-Pool, um alle Verbindungen sauber zu beenden.
   * - Gibt ein Promise zurück, damit Jest auf den Abschluss wartet.
   */
  afterAll(() => {
    return new Promise((resolve) => {
      server.close(async () => {
        await testPool.end();
        resolve();
      });
    });
  });

  // ---------------------------------------------------------------------------
  //  TESTFÄLLE
  // ---------------------------------------------------------------------------

  /**
   * Test 0: Verbindung zur Test-Datenbank
   * - Stellt sicher, dass die Test-Datenbank erreichbar ist, bevor die
   *   eigentlichen API-Tests starten.
   */
  it("DB-Server - sollte eine Verbindung zur Test-Datenbank herstellen können", async () => {
    let client;
    try {
      client = await testPool.connect();
      const res = await client.query("SELECT NOW()");
      expect(res.rows[0]).toBeDefined();
    } catch (err) {
      throw new Error(
        `Datenbank-Verbindungstest fehlgeschlagen: ${err.message}`
      );
    } finally {
      if (client) client.release();
    }
  });

  /**
   * Test 1: Erstellen eines neuen Projekts (POST)
   * - Simuliert einen POST-Request an /api/projekte.
   * - Erwartet den HTTP-Status 201 (Created).
   * - Überprüft, ob die Antwort eine ID und die korrekten Daten enthält.
   * - Speichert die zurückgegebene ID für die nachfolgenden Tests.
   */
  it("DB-Server - sollte ein neues Projekt erstellen (POST /api/projekte)", async () => {
    const response = await request(server)
      .post("/api/projekte")
      .set(dbHeaders)
      .send(dummyProject);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe(dummyProject.name);
    testProjectId = response.body.id; // ID für nächste Tests speichern
  });

  /**
   * Test 2: Auslesen eines spezifischen Projekts (GET by ID)
   * - Verwendet die ID aus dem vorherigen Test.
   * - Erwartet den HTTP-Status 200 (OK).
   * - Vergleicht die zurückgegebenen Daten mit den ursprünglichen Test-Daten.
   */
  it("DB-Server - sollte das erstellte Projekt auslesen (GET /api/projekte/:id)", async () => {
    expect(testProjectId).toBeDefined(); // Stellt sicher, dass der vorherige Test erfolgreich war
    const response = await request(server)
      .get(`/api/projekte/${testProjectId}`)
      .set(dbHeaders);

    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBe(testProjectId);
    expect(response.body.name).toBe(dummyProject.name);
  });

  /**
   * Test 3: Auslesen aller Projekte (GET all)
   * - Überprüft, ob das neu erstellte Projekt in der Gesamtliste enthalten ist.
   * - Erwartet den HTTP-Status 200 (OK).
   */
  it("DB-Server - sollte das erstellte Projekt in der Projektliste finden (GET /api/projekte)", async () => {
    const response = await request(server).get("/api/projekte").set(dbHeaders);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    const foundProject = response.body.find((p) => p.id === testProjectId);
    expect(foundProject).toBeDefined();
  });

  /**
   * Test 4: Komplettes Update eines Projekts (PUT)
   * - Sendet ein PUT-Request mit Daten für das Projekt und die Untertabellen.
   * - Erwartet den HTTP-Status 200 (OK).
   * - Überprüft anschließend durch GET-Anfragen, ob die Daten in den
   *   jeweiligen Untertabellen (fotos, messdaten etc.) korrekt angelegt wurden.
   */
  it("DB-Server - sollte ein Projekt komplett aktualisieren (PUT /api/projekt-komplett/:id)", async () => {
    expect(testProjectId).toBeDefined();

    const updateResponse = await request(server)
      .put(`/api/projekt-komplett/${testProjectId}`)
      .set(dbHeaders)
      .send(dummyProjektKomplett);

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.success).toBe(true);

    // Überprüfen der Untertabellen, ob die Daten korrekt angelegt wurden

    // 1. Fotos prüfen
    const fotosResponse = await request(server)
      .get(`/api/fotos?projekt_id=${testProjectId}`)
      .set(dbHeaders);
    expect(fotosResponse.statusCode).toBe(200);
    expect(fotosResponse.body.length).toBe(1);
    expect(fotosResponse.body[0].beschreibung).toBe(
      dummyProjektKomplett.fotos[0].beschreibung
    );

    // 2. Messdaten prüfen
    const messdatenResponse = await request(server)
      .get(`/api/messdaten?projekt_id=${testProjectId}`)
      .set(dbHeaders);
    expect(messdatenResponse.statusCode).toBe(200);
    expect(messdatenResponse.body.length).toBe(1);
    expect(parseFloat(messdatenResponse.body[0].wert)).toBe(
      dummyProjektKomplett.messdaten[0].wert
    );

    // 3. Sicherheit prüfen
    const sicherheitResponse = await request(server)
      .get(`/api/sicherheit?projekt_id=${testProjectId}`)
      .set(dbHeaders);
    expect(sicherheitResponse.statusCode).toBe(200);
    expect(sicherheitResponse.body.length).toBe(1);
    expect(sicherheitResponse.body[0].massnahme).toBe(
      dummyProjektKomplett.sicherheit[0].massnahme
    );

    // 4. Kalkulation prüfen
    const kalkulationResponse = await request(server)
      .get(`/api/kalkulation?projekt_id=${testProjectId}`)
      .set(dbHeaders);
    expect(kalkulationResponse.statusCode).toBe(200);
    expect(kalkulationResponse.body.length).toBe(1);
    expect(kalkulationResponse.body[0].position).toBe(
      dummyProjektKomplett.kalkulation[0].position
    );
  });

  /**
   * Test 5: Löschen eines Projekts (DELETE)
   * - Sendet einen DELETE-Request an /api/projekte/:id.
   * - Erwartet den HTTP-Status 200 (OK) und eine Erfolgsmeldung.
   */
  it("DB-Server - sollte das erstellte Projekt löschen (DELETE /api/projekte/:id)", async () => {
    expect(testProjectId).toBeDefined();
    const response = await request(server)
      .delete(`/api/projekte/${testProjectId}`)
      .set(dbHeaders);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  /**
   * Test 6: Überprüfung nach dem Löschen
   * - Versucht, das gelöschte Projekt erneut abzurufen.
   * - Erwartet den HTTP-Status 404 (Not Found).
   */
  it("DB-Server - sollte das gelöschte Projekt nicht mehr finden (GET /api/projekte/:id)", async () => {
    expect(testProjectId).toBeDefined();
    const response = await request(server)
      .get(`/api/projekte/${testProjectId}`)
      .set(dbHeaders);

    expect(response.statusCode).toBe(404);
  });
});
