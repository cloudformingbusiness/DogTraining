// src/utils/projectDataManager.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📦 PROJECT DATA MANAGER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Zweck: Zentrales Management aller Projekt-bezogenen Daten
 * 
 * Verwaltet alle Daten eines Projekts:
 * - Projekt-Stammdaten (Name, Adresse, Status)
 * - Messdaten
 * - Fotos/Dokumentation
 * - Sicherheitsmaßnahmen
 * - Kalkulationen
 * 
 * Unterstützt sowohl lokale Speicherung (AsyncStorage/localStorage)
 * als auch Server-Synchronisation.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getDatabaseConfig, getStorageMode } from "./dataStorage";

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface Messdaten {
  id: string;
  type: string; // z.B. "Länge", "Tiefe", "Durchmesser"
  value: string;
  unit?: string; // z.B. "m", "cm", "mm"
  timestamp: string;
  notizen?: string;
}

export interface FotoDokumentation {
  id: string;
  uri: string;
  beschreibung?: string;
  timestamp: string;
  typ?: "Baufortschritt" | "Schaden" | "Sonstiges";
}

export interface Sicherheitsmassnahme {
  id: string;
  massnahme: string;
  status: "geplant" | "durchgeführt" | "überprüft";
  verantwortlich?: string;
  datum: string;
  notizen?: string;
}

export interface Kalkulation {
  id: string;
  position: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
  notizen?: string;
  timestamp: string;
}

export interface ProjektStammdaten {
  id: string;
  projektName: string;
  projektBeschreibung: string;
  status: "active" | "completed" | "pending";
  
  // Adresse
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  
  // GPS (optional)
  latitude?: number;
  longitude?: number;
  
  // Zuständigkeit
  personalId?: string;
  projektleiter?: string;
  
  // Metadaten
  createdAt: string;
  updatedAt: string;
}

export interface CompleteProjektData {
  stammdaten: ProjektStammdaten;
  messdaten: Messdaten[];
  fotos: FotoDokumentation[];
  sicherheit: Sicherheitsmassnahme[];
  kalkulationen: Kalkulation[];
  
  // Metadaten
  lastSyncedAt?: string;
  version: string; // Für zukünftige Kompatibilität
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = "@BauLogPro:projekt:";
const STORAGE_KEYS = {
  projectList: "@BauLogPro:projectList",
  getProjectData: (projectId: string) => `${STORAGE_PREFIX}${projectId}`,
};

const CURRENT_VERSION = "1.1.1";

// ═══════════════════════════════════════════════════════════════════════════
// WEB STORAGE HELPER
// ═══════════════════════════════════════════════════════════════════════════

const webStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
  getAllKeys: async (): Promise<readonly string[]> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return Object.keys(window.localStorage);
    }
    return [];
  }
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// ═══════════════════════════════════════════════════════════════════════════
// LOKALE SPEICHERUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speichert komplette Projekt-Daten lokal
 */
export const saveProjectDataLocally = async (
  projectData: CompleteProjektData
): Promise<void> => {
  try {
    console.log("💾 [ProjectData] Speichere Projekt lokal:", projectData.stammdaten.projektName);
    
    const dataWithVersion: CompleteProjektData = {
      ...projectData,
      version: CURRENT_VERSION,
      stammdaten: {
        ...projectData.stammdaten,
        updatedAt: new Date().toISOString(),
      }
    };
    
    const key = STORAGE_KEYS.getProjectData(projectData.stammdaten.id);
    await storage.setItem(key, JSON.stringify(dataWithVersion));
    
    // Projekt-Liste aktualisieren
    await updateProjectList(projectData.stammdaten);
    
    console.log("✅ [ProjectData] Projekt gespeichert:", projectData.stammdaten.id);
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim lokalen Speichern:", error);
    throw error;
  }
};

/**
 * Lädt komplette Projekt-Daten lokal
 */
export const loadProjectDataLocally = async (
  projectId: string
): Promise<CompleteProjektData | null> => {
  try {
    console.log("📖 [ProjectData] Lade Projekt lokal:", projectId);
    
    const key = STORAGE_KEYS.getProjectData(projectId);
    const data = await storage.getItem(key);
    
    if (!data) {
      console.log("📭 [ProjectData] Kein Projekt gefunden:", projectId);
      return null;
    }
    
    const projectData = JSON.parse(data) as CompleteProjektData;
    console.log("✅ [ProjectData] Projekt geladen:", projectData.stammdaten.projektName);
    
    return projectData;
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim lokalen Laden:", error);
    return null;
  }
};

/**
 * Löscht Projekt-Daten lokal
 */
export const deleteProjectDataLocally = async (
  projectId: string
): Promise<void> => {
  try {
    console.log("🗑️ [ProjectData] Lösche Projekt lokal:", projectId);
    
    const key = STORAGE_KEYS.getProjectData(projectId);
    await storage.removeItem(key);
    
    // Aus Projekt-Liste entfernen
    await removeFromProjectList(projectId);
    
    console.log("✅ [ProjectData] Projekt gelöscht:", projectId);
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim Löschen:", error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROJEKT-LISTE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectListItem {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}

/**
 * Aktualisiert die Projekt-Liste
 */
const updateProjectList = async (stammdaten: ProjektStammdaten): Promise<void> => {
  try {
    const listData = await storage.getItem(STORAGE_KEYS.projectList);
    let projectList: ProjectListItem[] = listData ? JSON.parse(listData) : [];
    
    // Projekt aktualisieren oder hinzufügen
    const existingIndex = projectList.findIndex(p => p.id === stammdaten.id);
    const listItem: ProjectListItem = {
      id: stammdaten.id,
      name: stammdaten.projektName,
      status: stammdaten.status,
      updatedAt: stammdaten.updatedAt,
    };
    
    if (existingIndex >= 0) {
      projectList[existingIndex] = listItem;
    } else {
      projectList.push(listItem);
    }
    
    await storage.setItem(STORAGE_KEYS.projectList, JSON.stringify(projectList));
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim Aktualisieren der Projekt-Liste:", error);
  }
};

/**
 * Entfernt ein Projekt aus der Liste
 */
const removeFromProjectList = async (projectId: string): Promise<void> => {
  try {
    const listData = await storage.getItem(STORAGE_KEYS.projectList);
    if (!listData) return;
    
    let projectList: ProjectListItem[] = JSON.parse(listData);
    projectList = projectList.filter(p => p.id !== projectId);
    
    await storage.setItem(STORAGE_KEYS.projectList, JSON.stringify(projectList));
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim Entfernen aus Projekt-Liste:", error);
  }
};

/**
 * Lädt alle Projekte (nur Stammdaten)
 */
export const loadAllProjects = async (): Promise<ProjectListItem[]> => {
  try {
    const mode = await getStorageMode();
    if (mode === "database") {
      // API-Call: Alle Projekte vom Server holen
      const config = await getDatabaseConfig();
      if (!config.url) throw new Error("Server-URL fehlt.");
      const dynamicHeaders = await getDynamicDbHeaders();
      const response = await fetch(`${config.url}/api/projekte`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...dynamicHeaders,
        },
      });
      if (!response.ok) throw new Error(`Fehler beim Laden der Projekte: ${response.status}`);
      const result = await response.json();
      // Annahme: result ist ein Array von CompleteProjektData oder ProjektStammdaten
      // Falls CompleteProjektData, extrahiere die Stammdaten
      if (Array.isArray(result)) {
        if (result.length > 0 && result[0].stammdaten) {
          // Backend liefert CompleteProjektData[]
          return result.map((p: any) => p.stammdaten);
        }
        // Backend liefert direkt ProjektStammdaten[]
        return result as ProjektStammdaten[];
      }
      return [];
    }
    // Lokaler Modus: Lade Projekt-IDs aus AsyncStorage
    const listRaw = await storage.getItem(STORAGE_KEYS.projectList);
    if (!listRaw) return [];
    const idList: string[] = JSON.parse(listRaw);
    const projects: ProjektStammdaten[] = [];
    for (const id of idList) {
      const dataRaw = await storage.getItem(STORAGE_KEYS.getProjectData(id));
      if (dataRaw) {
        const data = JSON.parse(dataRaw) as CompleteProjektData;
        projects.push(data.stammdaten);
      }
    }
    return projects;
  }
  catch (error) {
    console.error("❌ [ProjectData] Fehler beim Laden der Projekt-Liste:", error);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SYNCHRONISATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt die Header für die dynamische DB-Verbindung basierend auf der lokalen Konfiguration.
 */
const getDynamicDbHeaders = async (): Promise<Record<string, string>> => {
  const dbConfig = await getDatabaseConfig();
  const headers: Record<string, string> = {};

  if (dbConfig.host) headers["x-db-host"] = dbConfig.host;
  if (dbConfig.port) headers["x-db-port"] = String(dbConfig.port);
  if (dbConfig.database) headers["x-db-name"] = dbConfig.database;
  if (dbConfig.user) headers["x-db-user"] = dbConfig.user;
  if (dbConfig.password) headers["x-db-password"] = dbConfig.password;

  // Der API-Key wird für die Authentifizierung der Routen weiterhin benötigt
  if (dbConfig.apiKey) headers["x-api-key"] = dbConfig.apiKey;

  return headers;
};

/**
 * Speichert Projekt-Daten auf dem Server.
 * Unterscheidet zwischen Erstellen (POST) und Aktualisieren (PUT).
 */
/* HINWEIS: Diese Funktion ist veraltet und wird nicht mehr verwendet.
   Die Server-Kommunikation findet jetzt direkt in der UI-Komponente statt,
   um eine bessere Fehlerbehandlung zu ermöglichen.
export const saveProjectDataToServer = async (
  projectData: CompleteProjektData,
  isUpdate: boolean = false
): Promise<void> => {
  try {
    const { id, projektName } = projectData.stammdaten;
    console.log(
      `🌐 [ProjectData] Speichere Projekt auf Server: ${projektName} (Modus: ${
        isUpdate ? "Aktualisieren" : "Erstellen"
      })`
    );

    const config = await getDatabaseConfig();
    if (!config.url) {
      throw new Error(
        "Server-URL fehlt. Bitte in den Einstellungen prüfen."
      );
    }

    const dynamicHeaders = await getDynamicDbHeaders();
    const url = isUpdate ? `${config.url}/api/projekte/${id}` : `${config.url}/api/projekte`;
    const method = isUpdate ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...dynamicHeaders,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Server-Fehler: ${response.status} ${response.statusText}. URL: ${url}, Body: ${errorBody}`
      );
    }

    const result = await response.json();
    console.log("✅ [ProjectData] Projekt auf Server gespeichert:", result);
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim Server-Speichern:", error);
    throw error;
  }
};
*/

/**
 * Lädt Projekt-Daten vom Server
 */
export const loadProjectDataFromServer = async (
  projectId: string
): Promise<CompleteProjektData | null> => {
  try {
    console.log("🌐 [ProjectData] Lade Projekt vom Server:", projectId);
    
    const config = await getDatabaseConfig();
    if (!config.url) {
      throw new Error("Server-URL fehlt. Bitte in den Einstellungen prüfen.");
    }
    
    const dynamicHeaders = await getDynamicDbHeaders();
    const response = await fetch(`${config.url}/api/projekte/${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...dynamicHeaders,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Server-Fehler: ${response.status}`);
    }
    
    const projectData = await response.json();
    console.log("✅ [ProjectData] Projekt vom Server geladen:", projectData.stammdaten.projektName);
    
    return projectData as CompleteProjektData;
  } catch (error) {
    console.error("❌ [ProjectData] Fehler beim Server-Laden:", error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED API (automatische Auswahl: lokal oder Server)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speichert Projekt-Daten (automatisch lokal oder Server)
 */
export const saveProjectData = async (
  projectData: CompleteProjektData
): Promise<void> => {
  // Diese Funktion ist jetzt ein Alias für die lokale Speicherung.
  // Die Server-Logik wird direkt in den UI-Komponenten gehandhabt.
  console.log("💾 [ProjectData] Speichere Projekt nur lokal (via saveProjectData).");
  await saveProjectDataLocally(projectData);
};

/**
 * Lädt Projekt-Daten (automatisch lokal oder Server)
 */
export const loadProjectData = async (
  projectId: string
): Promise<CompleteProjektData | null> => {
  const mode = await getStorageMode();
  
  if (mode === "database") {
    try {
      const config = await getDatabaseConfig();
      if (config.url) {
        const dynamicHeaders = await getDynamicDbHeaders();
        const response = await fetch(`${config.url}/api/projekte/${projectId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...dynamicHeaders,
          },
        });
        
        if (response.ok) {
          const projectData = await response.json();
          console.log("✅ [ProjectData] Projekt vom Server geladen:", projectData.stammdaten.projektName);
          return projectData as CompleteProjektData;
        } else if (response.status === 404) {
          return null;
        }
      }
    } catch (error) {
      console.warn("⚠️ [ProjectData] Server-Laden fehlgeschlagen, lade lokal");
    }
  }
  
  // Fallback auf lokale Daten
  return loadProjectDataLocally(projectId);
};

/**
 * Löscht Projekt-Daten (automatisch lokal oder Server)
 */
export const deleteProjectData = async (
  projectId: string
): Promise<void> => {
  const mode = await getStorageMode();
  
  if (mode === "database") {
    try {
      const config = await getDatabaseConfig();
      if (config.url) {
        const dynamicHeaders = await getDynamicDbHeaders();
        await fetch(`${config.url}/api/projekte/${projectId}`, {
          method: "DELETE",
          headers: {
            ...dynamicHeaders,
          },
        });
      }
    } catch (error) {
      console.warn("⚠️ [ProjectData] Server-Löschung fehlgeschlagen");
    }
  }
  
  await deleteProjectDataLocally(projectId);
};
