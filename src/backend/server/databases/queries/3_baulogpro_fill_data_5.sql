-- Bestehende Daten überschreiben
TRUNCATE TABLE ansprechparter CASCADE;
TRUNCATE TABLE kundendaten CASCADE;
TRUNCATE TABLE projekt_detail CASCADE;
TRUNCATE TABLE messdaten_erfassung CASCADE;
TRUNCATE TABLE messdaten CASCADE;
TRUNCATE TABLE fotodokumentation CASCADE;
TRUNCATE TABLE fotos CASCADE;
TRUNCATE TABLE sicherheitsmassnahmen CASCADE;
TRUNCATE TABLE massnahme CASCADE;
TRUNCATE TABLE kalkulation CASCADE;
TRUNCATE TABLE position CASCADE;
TRUNCATE TABLE bilddaten CASCADE;
TRUNCATE TABLE users CASCADE;
-- Beispiel-Datensätze für alle Tabellen
-- Erst Projekte ohne kundendaten_id einfügen
INSERT INTO projekt_detail (
        name,
        beschreibung,
        kunde,
        projektleiter,
        startdatum,
        enddatum,
        status,
        budget,
        plz,
        strasse,
        hausnummer,
        land,
        kontakt_email,
        kontakt_telefon,
        ersteller,
        notizen,
        dokumente,
        gps_koordinaten
    )
VALUES (
        'Projekt Alpha',
        'Neubau Büro',
        'Muster GmbH',
        'Max Mustermann',
        '2025-01-01',
        '2025-12-31',
        'aktiv',
        1000000,
        '10115',
        'Musterstraße',
        '1',
        'Deutschland',
        'info@muster.de',
        '+491234567890',
        'admin',
        'Alpha Notiz',
        'Dok1.pdf',
        '52.5200,13.4050'
    ),
    (
        'Projekt Beta',
        'Sanierung Schule',
        'Beispiel AG',
        'Erika Beispiel',
        '2025-02-01',
        '2025-11-30',
        'geplant',
        500000,
        '20095',
        'Beispielweg',
        '2',
        'Deutschland',
        'kontakt@beispiel.de',
        '+491234567891',
        'admin',
        'Beta Notiz',
        'Dok2.pdf',
        '53.5511,9.9937'
    ),
    (
        'Projekt Gamma',
        'Brückenneubau',
        'Test GmbH',
        'Hans Tester',
        '2025-03-01',
        '2025-10-31',
        'abgeschlossen',
        2000000,
        '80331',
        'Teststraße',
        '3',
        'Deutschland',
        'test@test.de',
        '+491234567892',
        'admin',
        'Gamma Notiz',
        'Dok3.pdf',
        '48.1351,11.5820'
    ),
    (
        'Projekt Delta',
        'Umbau Lager',
        'Delta AG',
        'Dora Delta',
        '2025-04-01',
        '2025-09-30',
        'aktiv',
        750000,
        '50667',
        'Deltaweg',
        '4',
        'Deutschland',
        'delta@delta.de',
        '+491234567893',
        'admin',
        'Delta Notiz',
        'Dok4.pdf',
        '50.9375,6.9603'
    ),
    (
        'Projekt Epsilon',
        'Neubau Schule',
        'Epsilon GmbH',
        'Egon Epsilon',
        '2025-05-01',
        '2025-08-31',
        'geplant',
        1200000,
        '60311',
        'Epsilonstraße',
        '5',
        'Deutschland',
        'epsilon@epsilon.de',
        '+491234567894',
        'admin',
        'Epsilon Notiz',
        'Dok5.pdf',
        '50.1109,8.6821'
    );
-- Dann Kundendaten einfügen
INSERT INTO kundendaten (
        projekt_id,
        firmenname,
        adresse,
        plz,
        ort,
        land,
        kontakt_email,
        kontakt_telefon,
        notizen
    )
VALUES (
        1,
        'Muster GmbH',
        'Musterstraße 1',
        '10115',
        'Berlin',
        'Deutschland',
        'info@muster.de',
        '+491234567890',
        'Kunde Alpha'
    ),
    (
        2,
        'Beispiel AG',
        'Beispielweg 2',
        '20095',
        'Hamburg',
        'Deutschland',
        'kontakt@beispiel.de',
        '+491234567891',
        'Kunde Beta'
    ),
    (
        3,
        'Test GmbH',
        'Teststraße 3',
        '80331',
        'München',
        'Deutschland',
        'test@test.de',
        '+491234567892',
        'Kunde Gamma'
    ),
    (
        4,
        'Delta AG',
        'Deltaweg 4',
        '50667',
        'Köln',
        'Deutschland',
        'delta@delta.de',
        '+491234567893',
        'Kunde Delta'
    ),
    (
        5,
        'Epsilon GmbH',
        'Epsilonstraße 5',
        '60311',
        'Frankfurt',
        'Deutschland',
        'epsilon@epsilon.de',
        '+491234567894',
        'Kunde Epsilon'
    );
-- Jetzt kundendaten_id in projekt_detail aktualisieren
UPDATE projekt_detail
SET kundendaten_id = id;
-- Beispiel-Datensätze für kundendaten
INSERT INTO kundendaten (
        projekt_id,
        firmenname,
        adresse,
        plz,
        ort,
        land,
        kontakt_email,
        kontakt_telefon,
        notizen
    )
VALUES (
        1,
        'Muster GmbH',
        'Musterstraße 1',
        '10115',
        'Berlin',
        'Deutschland',
        'info@muster.de',
        '+491234567890',
        'Kunde Alpha'
    ),
    (
        2,
        'Beispiel AG',
        'Beispielweg 2',
        '20095',
        'Hamburg',
        'Deutschland',
        'kontakt@beispiel.de',
        '+491234567891',
        'Kunde Beta'
    ),
    (
        3,
        'Test GmbH',
        'Teststraße 3',
        '80331',
        'München',
        'Deutschland',
        'test@test.de',
        '+491234567892',
        'Kunde Gamma'
    ),
    (
        4,
        'Delta AG',
        'Deltaweg 4',
        '50667',
        'Köln',
        'Deutschland',
        'delta@delta.de',
        '+491234567893',
        'Kunde Delta'
    ),
    (
        5,
        'Epsilon GmbH',
        'Epsilonstraße 5',
        '60311',
        'Frankfurt',
        'Deutschland',
        'epsilon@epsilon.de',
        '+491234567894',
        'Kunde Epsilon'
    );
-- Beispiel-Datensätze für ansprechparter
INSERT INTO ansprechparter (
        kundendaten_id,
        name,
        position,
        email,
        telefon,
        bemerkung
    )
VALUES -- Ansprechpartner für Kunde 1
    (
        1,
        'Max Mustermann',
        'Geschäftsführer',
        'max@muster.de',
        '+491234567890',
        'Hauptkontakt'
    ),
    (
        1,
        'Sabine Musterfrau',
        'Buchhaltung',
        'sabine@muster.de',
        '+491234567891',
        'Rechnungen'
    ),
    (
        1,
        'Peter Muster',
        'Technik',
        'peter@muster.de',
        '+491234567892',
        'Technischer Kontakt'
    ),
    -- Ansprechpartner für Kunde 2
    (
        2,
        'Erika Beispiel',
        'Projektleiterin',
        'erika@beispiel.de',
        '+491234567893',
        'Leitung'
    ),
    (
        2,
        'Frank Beispiel',
        'Einkauf',
        'frank@beispiel.de',
        '+491234567894',
        'Bestellungen'
    ),
    (
        2,
        'Lisa Beispiel',
        'Support',
        'lisa@beispiel.de',
        '+491234567895',
        'Kundensupport'
    ),
    -- Ansprechpartner für Kunde 3
    (
        3,
        'Hans Tester',
        'Bauleiter',
        'hans@test.de',
        '+491234567896',
        'Technik'
    ),
    (
        3,
        'Julia Test',
        'Planung',
        'julia@test.de',
        '+491234567897',
        'Projektplanung'
    ),
    (
        3,
        'Tom Test',
        'Controlling',
        'tom@test.de',
        '+491234567898',
        'Finanzen'
    ),
    -- Ansprechpartner für Kunde 4
    (
        4,
        'Dora Delta',
        'Lagerleitung',
        'dora@delta.de',
        '+491234567899',
        'Lager'
    ),
    -- Ansprechpartner für Kunde 5
    (
        5,
        'Egon Epsilon',
        'Schulleiter',
        'egon@epsilon.de',
        '+491234567900',
        'Schule'
    );
-- bilddaten
INSERT INTO bilddaten (bild)
VALUES (decode('FFD8FFE000104A464946', 'hex')),
    (decode('FFD8FFE100104A464946', 'hex')),
    (decode('FFD8FFE200104A464946', 'hex')),
    (decode('FFD8FFE300104A464946', 'hex')),
    (decode('FFD8FFE400104A464946', 'hex'));
-- messdaten_erfassung
INSERT INTO messdaten_erfassung (projekt_id, timestamp, notizen)
VALUES (1, '2025-01-10 08:00:00', 'Messung Alpha'),
    (2, '2025-02-15 09:00:00', 'Messung Beta'),
    (3, '2025-03-20 10:00:00', 'Messung Gamma'),
    (4, '2025-04-10 08:00:00', 'Messung Delta'),
    (5, '2025-05-15 09:00:00', 'Messung Epsilon');
-- messdaten
INSERT INTO messdaten (
        messdaten_erfassung_id,
        laenge,
        breite,
        verlegetiefe,
        oberflaechenart,
        einheit,
        timestamp,
        notizen
    )
VALUES (
        1,
        10.5,
        5.2,
        1.0,
        'Beton',
        'm',
        '2025-01-10 08:15:00',
        'Alpha Messung'
    ),
    (
        2,
        20.0,
        10.0,
        2.0,
        'Holz',
        'm',
        '2025-02-15 09:15:00',
        'Beta Messung'
    ),
    (
        3,
        15.0,
        7.5,
        1.5,
        'Stahl',
        'm',
        '2025-03-20 10:15:00',
        'Gamma Messung'
    ),
    (
        4,
        12.0,
        6.0,
        1.2,
        'Stein',
        'm',
        '2025-04-10 08:15:00',
        'Delta Messung'
    ),
    (
        5,
        18.0,
        8.0,
        1.8,
        'Glas',
        'm',
        '2025-05-15 09:15:00',
        'Epsilon Messung'
    );
-- fotodokumentation
INSERT INTO fotodokumentation (projekt_id, name, typ, timestamp, notizen)
VALUES (
        1,
        'Baustelle Alpha',
        'Vorher',
        '2025-01-15 08:30:00',
        'Alpha Foto'
    ),
    (
        2,
        'Schule Beta',
        'Nachher',
        '2025-02-20 09:30:00',
        'Beta Foto'
    ),
    (
        3,
        'Brücke Gamma',
        'Zwischenstand',
        '2025-03-25 10:30:00',
        'Gamma Foto'
    ),
    (
        4,
        'Lager Delta',
        'Vorher',
        '2025-04-15 08:30:00',
        'Delta Foto'
    ),
    (
        5,
        'Schule Epsilon',
        'Nachher',
        '2025-05-20 09:30:00',
        'Epsilon Foto'
    );
-- fotos
INSERT INTO fotos (
        fotodokumentation_id,
        url,
        latitude,
        longitude,
        accuracy,
        bild_vorher_id,
        bild_nachher_id,
        timestamp,
        notizen
    )
VALUES (
        1,
        'https://example.com/alpha.jpg',
        52.5200,
        13.4050,
        5.0,
        1,
        2,
        '2025-01-15 08:45:00',
        'Alpha-Foto'
    ),
    (
        2,
        'https://example.com/beta.jpg',
        53.5511,
        9.9937,
        4.5,
        2,
        3,
        '2025-02-20 09:45:00',
        'Beta-Foto'
    ),
    (
        3,
        'https://example.com/gamma.jpg',
        48.1351,
        11.5820,
        6.0,
        3,
        4,
        '2025-03-25 10:45:00',
        'Gamma-Foto'
    ),
    (
        4,
        'https://example.com/delta.jpg',
        50.9375,
        6.9603,
        5.5,
        4,
        5,
        '2025-04-15 08:45:00',
        'Delta-Foto'
    ),
    (
        5,
        'https://example.com/epsilon.jpg',
        50.1109,
        8.6821,
        4.8,
        5,
        1,
        '2025-05-20 09:45:00',
        'Epsilon-Foto'
    );
-- sicherheitsmassnahmen
INSERT INTO sicherheitsmassnahmen (projekt_id, menge, status, timestamp, bemerkung)
VALUES (
        1,
        5,
        'offen',
        '2025-01-20 11:00:00',
        'Gerüst prüfen'
    ),
    (
        2,
        3,
        'in Bearbeitung',
        '2025-02-25 12:00:00',
        'Absperrung setzen'
    ),
    (
        3,
        7,
        'abgeschlossen',
        '2025-03-30 13:00:00',
        'Warnschilder angebracht'
    ),
    (
        4,
        4,
        'offen',
        '2025-04-20 11:00:00',
        'Helmpflicht kontrollieren'
    ),
    (
        5,
        6,
        'in Bearbeitung',
        '2025-05-25 12:00:00',
        'Fluchtwege markieren'
    );
-- massnahme
INSERT INTO massnahme (sicherheitsmassnahmen_id, bezeichnung)
VALUES (1, 'Gerüst aufbauen'),
    (2, 'Absperrung setzen'),
    (3, 'Warnschilder anbringen'),
    (4, 'Helmpflicht kontrollieren'),
    (5, 'Fluchtwege markieren');
-- kalkulation
INSERT INTO kalkulation (
        projekt_id,
        menge,
        einheit,
        einzelpreis,
        gesamtpreis,
        notizen,
        timestamp
    )
VALUES (
        1,
        100,
        'm²',
        50.00,
        5000.00,
        'Bodenplatte',
        '2025-01-25 14:00:00'
    ),
    (
        2,
        200,
        'm²',
        30.00,
        6000.00,
        'Dachsanierung',
        '2025-02-28 15:00:00'
    ),
    (
        3,
        50,
        'm',
        100.00,
        5000.00,
        'Brückenpfeiler',
        '2025-03-31 16:00:00'
    ),
    (
        4,
        80,
        'm²',
        40.00,
        3200.00,
        'Lagerboden',
        '2025-04-25 14:00:00'
    ),
    (
        5,
        150,
        'm²',
        60.00,
        9000.00,
        'Schulhof',
        '2025-05-28 15:00:00'
    );
-- users
INSERT INTO users (
        username,
        email,
        password_hash,
        rolle,
        aktiv,
        created_at
    )
VALUES (
        'admin',
        'cloudforming@outlook.de',
        '$2b$10$JgIGR4lXR6T5EHX54/31cusOUv1sDovlC6EsyhhhZ5GUJJXbrZPYO',
        -- Password: test1234
        'admin',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'erika',
        'erika@beispiel.de',
        'hash2',
        'user',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'hans',
        'hans@test.de',
        'hash3',
        'user',
        false,
        CURRENT_TIMESTAMP
    ),
    (
        'dora',
        'dora@delta.de',
        'hash4',
        'user',
        true,
        CURRENT_TIMESTAMP
    ),
    (
        'egon',
        'egon@epsilon.de',
        'hash5',
        'user',
        true,
        CURRENT_TIMESTAMP
    );