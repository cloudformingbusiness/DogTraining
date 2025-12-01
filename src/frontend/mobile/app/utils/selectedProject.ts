// src/utils/selectedProject.ts
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 SELECTED PROJECT UTILITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Zweck: Globales Management des ausgewählten Projekts
 * 
 * Diese Utility stellt sicher, dass das im Dashboard ausgewählte Projekt
 * in allen anderen Views (Projekt, Messdaten, Fotos, etc.) verfügbar ist.
 * 
 * Unterstützt sowohl Mobile (AsyncStorage) als auch Web (localStorage).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@BauLogPro:selectedProject";

export interface SelectedProjectData {
  id: string;
  name: string;
  status: "active" | "completed" | "pending";
  selectedAt: string; // ISO timestamp
}

/**
 * Web-Fallback: Verwendet localStorage direkt
 */
const webStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      console.log("🌐 [Web localStorage] Gespeichert:", key);
    } else {
      throw new Error("localStorage nicht verfügbar");
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const value = window.localStorage.getItem(key);
      console.log("🌐 [Web localStorage] Geladen:", key, value ? "✓" : "✗");
      return value;
    }
    return null;
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      console.log("🌐 [Web localStorage] Gelöscht:", key);
    }
  }
};

/**
 * Wählt den richtigen Storage-Mechanismus basierend auf der Plattform
 */
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

export interface SelectedProjectData {
  id: string;
  name: string;
  status: "active" | "completed" | "pending";
  selectedAt: string; // ISO timestamp
}

/**
 * Speichert das aktuell ausgewählte Projekt
 */
export const setSelectedProject = async (
  projectData: Omit<SelectedProjectData, "selectedAt">
): Promise<void> => {
  try {
    const dataToSave: SelectedProjectData = {
      ...projectData,
      selectedAt: new Date().toISOString(),
    };
    
    console.log("💾 [selectedProject] Speichere auf Platform:", Platform.OS);
    console.log("💾 [selectedProject] Daten:", dataToSave);
    
    await storage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    
    console.log("✅ [selectedProject] Erfolgreich gespeichert:", projectData.name);
    
    // Verifizieren, dass es gespeichert wurde
    const verification = await storage.getItem(STORAGE_KEY);
    console.log("🔍 [selectedProject] Verifikation:", verification ? "OK" : "FEHLER");
    
  } catch (error) {
    console.error("❌ [selectedProject] Fehler beim Speichern:", error);
    console.error("❌ [selectedProject] Error Details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

/**
 * Lädt das aktuell ausgewählte Projekt
 */
export const getSelectedProject = async (): Promise<SelectedProjectData | null> => {
  try {
    console.log("📖 [selectedProject] Lade Projekt von Platform:", Platform.OS);
    
    const data = await storage.getItem(STORAGE_KEY);
    
    console.log("📖 [selectedProject] Geladene Daten:", data ? "Vorhanden" : "Leer");
    
    if (!data) {
      return null;
    }
    
    const parsed = JSON.parse(data) as SelectedProjectData;
    console.log("✅ [selectedProject] Projekt geladen:", parsed.name);
    
    return parsed;
  } catch (error) {
    console.error("❌ [selectedProject] Fehler beim Laden:", error);
    console.error("❌ [selectedProject] Error Details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
};

/**
 * Löscht die Projekt-Auswahl
 */
export const clearSelectedProject = async (): Promise<void> => {
  try {
    await storage.removeItem(STORAGE_KEY);
    console.log("🗑️ [selectedProject] Projekt-Auswahl gelöscht");
  } catch (error) {
    console.error("❌ [selectedProject] Fehler beim Löschen:", error);
    throw error;
  }
};

/**
 * Prüft, ob ein Projekt ausgewählt ist
 */
export const hasSelectedProject = async (): Promise<boolean> => {
  const project = await getSelectedProject();
  return project !== null;
};
