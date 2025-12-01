/**
 * Setzt die Default-API-URL (HTTP) in AsyncStorage und überschreibt alte Werte.
 */
export async function setDefaultApiUrl(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.DATABASE_URL,
      "https://api.cloudforming.de"
    );
    console.log("✅ Default-API-URL gesetzt!");
  } catch (error) {
    console.error("❌ Fehler beim Setzen der Default-API-URL:", error);
  }
}
// src/utils/dataStorage.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💾 DATA STORAGE UTILITIES - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zentrale Verwaltung der Datenspeicherung mit Unterstützung für:
 * - Lokale Speicherung (AsyncStorage)
 * - Externe Datenbank (via API)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type StorageMode = "local" | "database";

const STORAGE_KEYS = {
  MODE: "@DataStorage:mode",
  DATABASE_URL: "@DataStorage:databaseUrl",
  DATABASE_API_KEY: "@DataStorage:databaseApiKey",
  // Neue Keys für die detaillierte Konfiguration, passend zu Settings.tsx
  DATABASE_HOST: "@Einstellungen:databaseHost",
  DATABASE_NAME: "@Einstellungen:databaseName",
  DATABASE_USER: "@Einstellungen:databaseUser",
  DATABASE_PASSWORD: "@Einstellungen:databasePassword",
  // Port wird vorerst als statisch angenommen, kann aber später hinzugefügt werden
};

/**
 * Typdefinition für die vollständige Datenbankkonfiguration
 */
export interface DatabaseConfig {
  url: string;
  apiKey: string;
  host: string;
  port: string; // Port ist immer ein String
  database: string;
  user: string;
  password: string;
}

/**
 * Holt den aktuellen Speichermodus
 */
export async function getStorageMode(): Promise<StorageMode> {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
    return (mode as StorageMode) || "local";
  } catch (error) {
    console.error("❌ Fehler beim Laden des Speichermodus:", error);
    return "local";
  }
}

/**
 * Setzt den Speichermodus
 */
export async function setStorageMode(mode: StorageMode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, mode);
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Speichermodus:", error);
    throw error;
  }
}

/**
 * Holt die vollständige Datenbank-Konfiguration
 */
export async function getDatabaseConfig(): Promise<DatabaseConfig> {
  try {
    const [
      url,
      apiKey,
      host,
      database,
      user,
      password,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_URL),
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_API_KEY),
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_HOST),
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_NAME),
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_USER),
      AsyncStorage.getItem(STORAGE_KEYS.DATABASE_PASSWORD),
    ]);

    return {
      // Fallback: HTTP-API-URL statt PostgreSQL-URL
      url: url || "https://api.cloudforming.de",
      apiKey: apiKey || "",
      host: host || "",
      port: "5432", // Standard-Port für PostgreSQL
      database: database || "",
      user: user || "",
      password: password || "",
    };
  } catch (error) {
    console.error("❌ Fehler beim Laden der Datenbank-Konfiguration:", error);
    return {
      url: "",
      apiKey: "",
      host: "",
      port: "5432",
      database: "",
      user: "",
      password: "",
    };
  }
}

/**
 * Speichert die Datenbank-Konfiguration
 */
export async function setDatabaseConfig(
  config: Partial<DatabaseConfig>
): Promise<void> {
  try {
    const tasks: Promise<void>[] = [];
    if (config.url !== undefined)
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.DATABASE_URL, config.url));
    if (config.apiKey !== undefined)
      tasks.push(
        AsyncStorage.setItem(STORAGE_KEYS.DATABASE_API_KEY, config.apiKey)
      );
    if (config.host !== undefined)
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.DATABASE_HOST, config.host));
    if (config.database !== undefined)
      tasks.push(
        AsyncStorage.setItem(STORAGE_KEYS.DATABASE_NAME, config.database)
      );
    if (config.user !== undefined)
      tasks.push(AsyncStorage.setItem(STORAGE_KEYS.DATABASE_USER, config.user));
    if (config.password !== undefined)
      tasks.push(
        AsyncStorage.setItem(STORAGE_KEYS.DATABASE_PASSWORD, config.password)
      );

    await Promise.all(tasks);
  } catch (error) {
    console.error(
      "❌ Fehler beim Speichern der Datenbank-Konfiguration:",
      error
    );
    throw error;
  }
}

/**
 * Speichert Daten je nach Modus
 */
export async function saveData(
  key: string,
  data: any
): Promise<{ success: boolean; message?: string }> {
  const mode = await getStorageMode();

  if (mode === "local") {
    return saveLocally(key, data);
  } else {
    return saveToDatable(key, data);
  }
}

/**
 * Lädt Daten je nach Modus
 */
export async function loadData(
  key: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  const mode = await getStorageMode();

  if (mode === "local") {
    return loadLocally(key);
  } else {
    return loadFromDatabase(key);
  }
}

/**
 * Speichert Daten lokal
 */
export async function saveLocally(
  key: string,
  data: any
): Promise<{ success: boolean; message?: string }> {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    return { success: true };
  } catch (error) {
    console.error("❌ Fehler beim lokalen Speichern:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

/**
 * Lädt Daten lokal
 */
async function loadLocally(
  key: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      return { success: true, data: null };
    }
    const data = JSON.parse(jsonValue);
    return { success: true, data };
  } catch (error) {
    console.error("❌ Fehler beim lokalen Laden:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

/**
 * Speichert Daten in externer Datenbank
 */
async function saveToDatable(
  key: string,
  data: any
): Promise<{ success: boolean; message?: string }> {
  try {
    const config = await getDatabaseConfig();

    if (!config.url) {
      throw new Error("Datenbank-URL ist nicht konfiguriert");
    }

    const response = await fetch(`${config.url}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
      body: JSON.stringify({ key, data }),
    });

    if (!response.ok) {
      throw new Error(
        `Datenbank-Fehler: ${response.status} ${response.statusText}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Fehler beim Speichern in Datenbank:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}

/**
 * Lädt Daten aus externer Datenbank
 */
async function loadFromDatabase(
  key: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const config = await getDatabaseConfig();

    if (!config.url) {
      throw new Error("Datenbank-URL ist nicht konfiguriert");
    }

    const response = await fetch(`${config.url}/load/${key}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Datenbank-Fehler: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error("❌ Fehler beim Laden aus Datenbank:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unbekannter Fehler",
    };
  }
}
