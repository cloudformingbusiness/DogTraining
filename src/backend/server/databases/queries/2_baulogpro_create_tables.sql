-- Alle Tabellen löschen
DROP TABLE IF EXISTS ansprechparter CASCADE;
DROP TABLE IF EXISTS massnahme CASCADE;
DROP TABLE IF EXISTS position CASCADE;
DROP TABLE IF EXISTS messdaten CASCADE;
DROP TABLE IF EXISTS fotos CASCADE;
DROP TABLE IF EXISTS messdaten_erfassung CASCADE;
DROP TABLE IF EXISTS fotodokumentation CASCADE;
DROP TABLE IF EXISTS sicherheitsmassnahmen CASCADE;
DROP TABLE IF EXISTS kalkulation CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS bilddaten CASCADE;
DROP TABLE IF EXISTS kundendaten CASCADE;
DROP TABLE IF EXISTS projekt_detail CASCADE;
-- Erst die Haupttabelle projekt_detail erstellen
CREATE TABLE projekt_detail (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    beschreibung TEXT,
    kunde VARCHAR(255),
    projektleiter VARCHAR(255),
    startdatum DATE,
    enddatum DATE,
    status VARCHAR(50),
    budget DECIMAL(15, 2),
    plz VARCHAR(10),
    strasse VARCHAR(255),
    hausnummer VARCHAR(20),
    land VARCHAR(100),
    kontakt_email VARCHAR(255),
    kontakt_telefon VARCHAR(50),
    ersteller VARCHAR(255),
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notizen TEXT,
    dokumente TEXT,
    gps_koordinaten VARCHAR(50),
    kundendaten_id INTEGER
);
-- Dann die Tabelle kundendaten
CREATE TABLE kundendaten (
    id SERIAL PRIMARY KEY,
    projekt_id INTEGER,
    firmenname VARCHAR(255) NOT NULL,
    adresse VARCHAR(255),
    plz VARCHAR(10),
    ort VARCHAR(100),
    land VARCHAR(100),
    kontakt_email VARCHAR(255),
    kontakt_telefon VARCHAR(50),
    notizen TEXT,
    CONSTRAINT fk_projekt_id FOREIGN KEY (projekt_id) REFERENCES projekt_detail(id) ON DELETE CASCADE
);
-- Nachträglich Fremdschlüssel von projekt_detail auf kundendaten setzen
ALTER TABLE projekt_detail
ADD CONSTRAINT fk_kundendaten_id FOREIGN KEY (kundendaten_id) REFERENCES kundendaten(id) ON DELETE
SET NULL;
-- ...weitere Tabellen wie gehabt...
-- Nachträglich Fremdschlüssel setzen
-- Untertabelle: ansprechparter
CREATE TABLE ansprechparter (
    id SERIAL PRIMARY KEY,
    kundendaten_id INTEGER REFERENCES kundendaten(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    telefon VARCHAR(50),
    bemerkung TEXT
);
-- ...alle weiteren CREATE TABLE wie gehabt...
-- Nachträglich Fremdschlüssel setzen (am Ende des Skripts!)
-- Haupttabelle: MessdatenErfassung
CREATE TABLE messdaten_erfassung (
    id SERIAL PRIMARY KEY,
    projekt_id INTEGER REFERENCES projekt_detail(id) ON DELETE CASCADE,
    timestamp TIMESTAMP,
    notizen TEXT
);
-- Untertabelle: Messdaten
CREATE TABLE messdaten (
    id SERIAL PRIMARY KEY,
    messdaten_erfassung_id INTEGER REFERENCES messdaten_erfassung(id) ON DELETE CASCADE,
    laenge DECIMAL(15, 4),
    breite DECIMAL(15, 4),
    verlegetiefe DECIMAL(15, 4),
    oberflaechenart VARCHAR(50),
    einheit VARCHAR(50),
    timestamp TIMESTAMP,
    notizen TEXT
);
-- Haupttabelle: Fotodokumentation
CREATE TABLE fotodokumentation (
    id SERIAL PRIMARY KEY,
    projekt_id INTEGER REFERENCES projekt_detail(id) ON DELETE CASCADE,
    name VARCHAR(255),
    typ VARCHAR(50),
    timestamp TIMESTAMP,
    notizen TEXT
);
-- Tabelle: bilddaten
CREATE TABLE bilddaten (
    id SERIAL PRIMARY KEY,
    bild BYTEA NOT NULL,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Untertabelle: Fotos
CREATE TABLE fotos (
    id SERIAL PRIMARY KEY,
    fotodokumentation_id INTEGER REFERENCES fotodokumentation(id) ON DELETE CASCADE,
    url TEXT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    accuracy DECIMAL(10, 6),
    bild_vorher_id INTEGER REFERENCES bilddaten(id) ON DELETE
    SET NULL,
        bild_nachher_id INTEGER REFERENCES bilddaten(id) ON DELETE
    SET NULL,
        timestamp TIMESTAMP,
        notizen TEXT
);
-- Weitere Tabellen
CREATE TABLE sicherheitsmassnahmen (
    id SERIAL PRIMARY KEY,
    projekt_id INTEGER REFERENCES projekt_detail(id) ON DELETE CASCADE,
    massnahme TEXT,
    menge INTEGER,
    status VARCHAR(50),
    timestamp TIMESTAMP,
    bemerkung TEXT
);
CREATE TABLE kalkulation (
    id SERIAL PRIMARY KEY,
    projekt_id INTEGER REFERENCES projekt_detail(id) ON DELETE CASCADE,
    position VARCHAR(255),
    menge DECIMAL(15, 2),
    einheit VARCHAR(50),
    einzelpreis DECIMAL(15, 2),
    gesamtpreis DECIMAL(15, 2),
    notizen TEXT,
    timestamp TIMESTAMP
);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rolle VARCHAR(50),
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aktiv BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Untertabelle: Massnahme
CREATE TABLE massnahme (
    id SERIAL PRIMARY KEY,
    sicherheitsmassnahmen_id INTEGER REFERENCES sicherheitsmassnahmen(id) ON DELETE CASCADE,
    bezeichnung TEXT NOT NULL
);
-- Untertabelle: Position
CREATE TABLE position (
    id SERIAL PRIMARY KEY,
    kalkulation_id INTEGER REFERENCES kalkulation(id) ON DELETE CASCADE,
    bezeichnung VARCHAR(255) NOT NULL
);