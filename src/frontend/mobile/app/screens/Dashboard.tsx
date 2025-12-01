// src/screens/Dashboard.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 DASHBOARD SCREEN - baulogpro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Schneller Überblick über aktive Projekte und Dokumentationen
 *
 * Beschreibung:
 * Das Dashboard bietet Nutzern einen zentralen Überblick über alle aktiven
 * Projekte und offenen Dokumentationen. Es zeigt Gesamtlängen der Kabeltrassen
 * und summierte Ergebnisse aus Kalkulationen und Sicherheitsmaßnahmen.
 *
 * Features:
 * - Projekt-Übersicht mit Zusammenfassungen
 * - Filter- und Auswahlmöglichkeiten
 * - Liste aktiver Projekte
 * - Pull-to-Refresh Funktionalität
 * - Offline-Entwürfe via AsyncStorage
 * - Clipboard-Unterstützung
 *
 * Zielgruppe: Projektmanager, Ingenieure, Mitarbeiter im Kabelmanagement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  RefreshControl,
  SafeAreaView,
  View,
} from "react-native";
import styled from "styled-components/native";
import { Button, Card, CardText, Input, Select, Text } from "../components";
import type { AppTheme } from "../themes";
import { setDefaultApiUrl } from "../utils/dataStorage";
import {
  deleteProjectData,
  loadAllProjects,
  loadProjectData,
  saveProjectData,
  type CompleteProjektData,
  type ProjektStammdaten,
} from "../utils/projectDataManager";
import { setSelectedProject as saveSelectedProject } from "../utils/selectedProject";

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface Project {
  id: string;
  name: string;
  status: "active" | "completed" | "pending";
  totalLength: number;
  documentation: number;
  calculations: number;
  safetyMeasures: number;
}

interface DashboardData {
  projects: Project[];
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalLength: number;
    totalDocumentations: number;
    totalCalculations: number;
    totalSafetyMeasures: number;
  };
}

interface ApiResponse {
  status: "success" | "error";
  message?: string;
  data?: DashboardData;
}

// ═══════════════════════════════════════════════════════════════════════════
// API KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════

const API_CREATE = "https://n8n.cloudforming.de/webhook/Dashboard-create";
const API_UPDATE = "https://n8n.cloudforming.de/webhook/Dashboard-update";
const API_LIST = "https://n8n.cloudforming.de/webhook/Dashboard-list";
const API_DELETE = "https://n8n.cloudforming.de/webhook/Dashboard-delete";
const HOOK_SECRET = "MY_SUPER_SECRET";

// ═══════════════════════════════════════════════════════════════════════════
// ASYNCSTORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  data: "@Dashboard:data",
  loading: "@Dashboard:loading",
  selectedProject: "@Dashboard:selectedProject",
  lastUpdate: "@Dashboard:lastUpdate",
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Wrapper = styled.View<{ theme: AppTheme }>`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Header = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  padding-bottom: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
`;

const HeaderTitle = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const HeaderIcon = styled.Text`
  font-size: 28px;
  margin-right: 12px;
`;

const ScrollContainer = styled.ScrollView<{ theme: AppTheme }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg}px;
  padding-bottom: 100px;
`;

const InfoBanner = styled.View<{
  theme: AppTheme;
  type: "error" | "info" | "success";
}>`
  background-color: ${({ theme, type }) =>
    type === "error" ? "#FFEBEE" : type === "success" ? "#E8F5E9" : "#E3F2FD"};
  border-left-width: 4px;
  border-left-color: ${({ type }) =>
    type === "error" ? "#D32F2F" : type === "success" ? "#388E3C" : "#1976D2"};
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const InfoBannerText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
`;

const SummaryCard = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.components.card.borderRadius}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  border: ${({ theme }) => theme.components.card.borderWidth}px solid
    ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const SummaryGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const SummaryItem = styled.View<{ theme: AppTheme }>`
  width: 48%;
  padding: ${({ theme }) => theme.spacing.md}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SummaryLabel = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.small}px;
  margin-bottom: ${({ theme }) => theme.spacing.xs}px;
`;

const SummaryValue = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.h2}px;
  font-weight: 700;
`;

const ProjectListItem = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const ProjectHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const ProjectName = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  flex: 1;
`;

const ProjectStatus = styled.View<{
  theme: AppTheme;
  status: "active" | "completed" | "pending";
}>`
  background-color: ${({ status }) =>
    status === "active"
      ? "#4CAF50"
      : status === "completed"
      ? "#2196F3"
      : "#FF9800"};
  padding: ${({ theme }) => theme.spacing.xs}px
    ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
`;

const ProjectStatusText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
`;

const ProjectDetails = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.small}px;
  margin-top: ${({ theme }) => theme.spacing.xs}px;
`;

const EmptyState = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.xxl}px;
  align-items: center;
  justify-content: center;
`;

const EmptyStateIcon = styled.Text`
  font-size: 64px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const EmptyStateText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.body}px;
  text-align: center;
`;

const FooterActions = styled.View<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.lg}px;
  background-color: ${({ theme }) => theme.colors.card};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
`;

const LoadingOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  z-index: 999;
`;

const ExpandableSection = styled.View<{ theme: AppTheme }>`
  margin-top: ${({ theme }) => theme.spacing.sm}px;
`;

const ExpandButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.md}px;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
`;

const ExpandButtonText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
`;

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  // Formular State
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Neues Projekt State
  const [showNewProjectForm, setShowNewProjectForm] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("");
  const [newProjectDescription, setNewProjectDescription] =
    useState<string>("");

  // Daten State
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    projects: [],
    summary: {
      totalProjects: 0,
      activeProjects: 0,
      totalLength: 0,
      totalDocumentations: 0,
      totalCalculations: 0,
      totalSafetyMeasures: 0,
    },
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    // Lade echte Projekte aus lokalem Storage
    loadRealProjects();
  }, []);

  useEffect(() => {
    const fixUrl = async () => {
      console.log("Versuche, die API-URL zu korrigieren...");
      await setDefaultApiUrl();
      console.log("API-URL sollte jetzt korrigiert sein.");
    };
    fixUrl();
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ASYNCSTORAGE FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Lädt alle echten Projekte aus dem lokalen Storage
   */
  const loadRealProjects = async () => {
    try {
      console.log("📖 [Dashboard] Lade echte Projekte...");

      // Lade Projekt-Liste
      const projectList = await loadAllProjects();
      console.log("📋 [Dashboard] Gefundene Projekte:", projectList.length);

      // Lade ausgewähltes Projekt
      const storedProject = await AsyncStorage.getItem(
        STORAGE_KEYS.selectedProject
      );
      if (storedProject) {
        setSelectedProject(storedProject);
      }

      // Wenn keine Projekte vorhanden, zeige leeres Dashboard
      if (projectList.length === 0) {
        console.log("📭 [Dashboard] Keine Projekte gefunden");
        setDashboardData({
          projects: [],
          summary: {
            totalProjects: 0,
            activeProjects: 0,
            totalLength: 0,
            totalDocumentations: 0,
            totalCalculations: 0,
            totalSafetyMeasures: 0,
          },
        });
        return;
      }

      // Lade vollständige Daten für alle Projekte
      const projectsWithData = await Promise.all(
        projectList.map(async (proj) => {
          const fullData = await loadProjectData(proj.id);
          if (!fullData) {
            return {
              id: proj.id,
              name: proj.name,
              status: proj.status as "active" | "completed" | "pending",
              totalLength: 0,
              documentation: 0,
              calculations: 0,
              safetyMeasures: 0,
            };
          }

          // Berechne Statistiken aus den Daten
          const totalLength = fullData.messdaten.reduce((sum, m) => {
            const value = parseFloat(m.value) || 0;
            return sum + value;
          }, 0);

          return {
            id: fullData.stammdaten.id,
            name: fullData.stammdaten.projektName,
            status: fullData.stammdaten.status,
            totalLength: Math.round(totalLength),
            documentation: fullData.fotos.length,
            calculations: fullData.kalkulationen.length,
            safetyMeasures: fullData.sicherheit.length,
          };
        })
      );

      // Berechne Zusammenfassung
      const summary = {
        totalProjects: projectsWithData.length,
        activeProjects: projectsWithData.filter((p) => p.status === "active")
          .length,
        totalLength: projectsWithData.reduce(
          (sum, p) => sum + p.totalLength,
          0
        ),
        totalDocumentations: projectsWithData.reduce(
          (sum, p) => sum + p.documentation,
          0
        ),
        totalCalculations: projectsWithData.reduce(
          (sum, p) => sum + p.calculations,
          0
        ),
        totalSafetyMeasures: projectsWithData.reduce(
          (sum, p) => sum + p.safetyMeasures,
          0
        ),
      };

      setDashboardData({
        projects: projectsWithData,
        summary,
      });

      console.log("✅ [Dashboard] Projekte geladen:", projectsWithData.length);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unbekannter Fehler";
      let displayMessage = errorMessage;
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("Network request failed")
      ) {
        displayMessage =
          "⚠️ Server nicht erreichbar - Die Test-Daten werden weiterhin angezeigt.";
      }
      setError(displayMessage);
      console.error("❌ Fehler beim Laden der Dashboard-Daten:", error);
      Alert.alert("❌ Fehler beim Laden der Projekte", `${displayMessage}`);
    }
  };

  const loadStoredData = async () => {
    try {
      const [storedData, storedProject] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.data),
        AsyncStorage.getItem(STORAGE_KEYS.selectedProject),
      ]);

      if (storedData) {
        setDashboardData(JSON.parse(storedData));
      }
      if (storedProject) {
        setSelectedProject(storedProject);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden der gespeicherten Daten:", error);
    }
  };

  const saveToStorage = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Fehler beim Speichern von ${key}:`, error);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError("");

    try {
      console.log("🔄 Lade Dashboard-Daten von:", API_LIST);

      const response = await fetch(API_LIST, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-hook-secret": HOOK_SECRET,
          Accept: "application/json",
        },
        // Timeout nach 10 Sekunden
      }).catch((fetchError) => {
        throw new Error(
          "Netzwerkfehler: Server nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung."
        );
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "Serverfehler");
      }

      if (result.data) {
        setDashboardData(result.data);
        await saveToStorage(STORAGE_KEYS.data, result.data);
        await AsyncStorage.setItem(
          STORAGE_KEYS.lastUpdate,
          new Date().toISOString()
        );
        setError(""); // Fehler zurücksetzen bei Erfolg
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unbekannter Fehler";

      // Benutzerfreundlichere Fehlermeldungen
      let displayMessage = errorMessage;
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("Network request failed")
      ) {
        displayMessage =
          "⚠️ Server nicht erreichbar - Die Test-Daten werden weiterhin angezeigt.";
      }

      setError(displayMessage);
      console.error("❌ Fehler beim Laden der Dashboard-Daten:", error);

      // Keine Alert-Meldung mehr beim automatischen Laden
      // Alert.alert(
      //   "❌ Fehler beim Laden",
      //   `Es gab ein Problem beim Laden der Daten.\n\n${errorMessage}\n\nBitte überprüfen Sie Ihre Verbindung.`
      // );
    } finally {
      setIsLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    if (!selectedProject) {
      Alert.alert(
        "❌ Eingabefehler",
        "Bitte wählen Sie ein Projekt aus der Liste."
      );
      return false;
    }
    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUTTON AKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleProjectSelection = async () => {
    if (!validateForm()) return;

    const project = dashboardData.projects.find(
      (p) => p.id === selectedProject
    );
    if (!project) return;

    try {
      // Speichere das ausgewählte Projekt global für andere Tabs
      await saveSelectedProject({
        id: project.id,
        name: project.name,
        status: project.status,
      });

      Alert.alert(
        "✅ Projekt ausgewählt",
        `Projekt: ${project.name}\n\n` +
          `Status: ${
            project.status === "active"
              ? "Aktiv"
              : project.status === "completed"
              ? "Abgeschlossen"
              : "Ausstehend"
          }\n` +
          `Gesamtlänge: ${project.totalLength}m\n` +
          `Dokumentationen: ${project.documentation}\n` +
          `Kalkulationen: ${project.calculations}\n` +
          `Sicherheitsmaßnahmen: ${project.safetyMeasures}\n\n` +
          `📋 Das Projekt kann jetzt in den anderen Tabs bearbeitet werden.`,
        [
          {
            text: "📋 Kopieren",
            onPress: () => {
              const projectInfo = `Projekt: ${project.name}\nStatus: ${project.status}\nGesamtlänge: ${project.totalLength}m\nDokumentationen: ${project.documentation}\nKalkulationen: ${project.calculations}\nSicherheitsmaßnahmen: ${project.safetyMeasures}`;
              Clipboard.setString(projectInfo);
              Alert.alert(
                "✅ Kopiert",
                "Projektinformationen wurden in die Zwischenablage kopiert."
              );
            },
          },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.error("❌ Fehler beim Auswählen des Projekts:", error);
      Alert.alert(
        "❌ Fehler",
        "Das Projekt konnte nicht ausgewählt werden. Bitte versuchen Sie es erneut."
      );
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEUES PROJEKT ERSTELLEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      Alert.alert(
        "⚠️ Eingabefehler",
        "Bitte geben Sie einen Projektnamen ein."
      );
      return;
    }

    if (newProjectName.trim().length < 3) {
      Alert.alert(
        "⚠️ Eingabefehler",
        "Der Projektname muss mindestens 3 Zeichen lang sein."
      );
      return;
    }

    setIsLoading(true);
    try {
      console.log("📦 Erstelle neues Projekt:", newProjectName);

      // Generiere neue Projekt-ID
      const projektId = Date.now().toString();

      // Erstelle Stammdaten
      const stammdaten: ProjektStammdaten = {
        id: projektId,
        projektName: newProjectName.trim(),
        projektBeschreibung: newProjectDescription.trim(),
        status: "active",
        strasse: "",
        hausnummer: "",
        plz: "",
        ort: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Erstelle vollständiges Projekt mit leeren Arrays
      const neuesProjekt: CompleteProjektData = {
        stammdaten,
        messdaten: [],
        fotos: [],
        sicherheit: [],
        kalkulationen: [],
        version: "1.0.0",
      };

      // Speichere Projekt lokal
      await saveProjectData(neuesProjekt);
      console.log("✅ Projekt lokal gespeichert");

      // Wähle das neue Projekt automatisch aus
      await saveSelectedProject({
        id: projektId,
        name: stammdaten.projektName,
        status: stammdaten.status,
      });

      // Lade Dashboard neu, um das neue Projekt anzuzeigen
      await loadRealProjects();

      // Setze das neue Projekt als ausgewählt
      setSelectedProject(projektId);

      // Formular zurücksetzen
      setNewProjectName("");
      setNewProjectDescription("");
      setShowNewProjectForm(false);

      Alert.alert(
        "✅ Projekt erstellt",
        `Das Projekt "${stammdaten.projektName}" wurde erfolgreich erstellt und ausgewählt!\n\n` +
          `Sie können jetzt in den anderen Tabs:\n` +
          `• 📏 Messdaten erfassen\n` +
          `• 📸 Fotos dokumentieren\n` +
          `• 🪖 Sicherheitsmaßnahmen hinzufügen\n` +
          `• 💰 Kalkulationen erstellen`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("❌ Fehler beim Erstellen des Projekts:", error);
      Alert.alert(
        "❌ Fehler",
        `Das Projekt konnte nicht erstellt werden.\n\n${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PULL-TO-REFRESH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRealProjects();
    setRefreshing(false);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXPANDABLE SECTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROJEKT STATUS ÄNDERN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleChangeProjectStatus = (project: Project) => {
    const statusOptions = [
      { label: "🟢 Aktiv", value: "active" },
      { label: "🔵 Abgeschlossen", value: "completed" },
      { label: "🟠 Ausstehend", value: "pending" },
    ];

    Alert.alert(
      "📊 Projektstatus ändern",
      `Aktueller Status: ${getStatusText(
        project.status
      )}\n\nWählen Sie einen neuen Status:`,
      [
        {
          text: "🟢 Aktiv",
          onPress: () => updateProjectStatus(project.id, "active"),
        },
        {
          text: "🔵 Abgeschlossen",
          onPress: () => updateProjectStatus(project.id, "completed"),
        },
        {
          text: "🟠 Ausstehend",
          onPress: () => updateProjectStatus(project.id, "pending"),
        },
        {
          text: "Abbrechen",
          style: "cancel",
        },
      ]
    );
  };

  const updateProjectStatus = async (
    projectId: string,
    newStatus: "active" | "completed" | "pending"
  ) => {
    try {
      setIsLoading(true);

      // Aktualisiere Projekte mit neuem Status
      const updatedProjects = dashboardData.projects.map((p) =>
        p.id === projectId ? { ...p, status: newStatus } : p
      );

      // Berechne neue Summary-Daten
      const newActiveCount = updatedProjects.filter(
        (p) => p.status === "active"
      ).length;

      const updatedData = {
        ...dashboardData,
        projects: updatedProjects,
        summary: {
          ...dashboardData.summary,
          activeProjects: newActiveCount,
        },
      };

      // Aktualisiere lokalen State
      setDashboardData(updatedData);

      // Speichere in AsyncStorage
      await saveToStorage(STORAGE_KEYS.data, updatedData);

      // Optional: API-Aufruf zum Server (wenn gewünscht)
      // await fetch(API_UPDATE, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-hook-secret": HOOK_SECRET,
      //   },
      //   body: JSON.stringify({ projectId, status: newStatus }),
      // });

      Alert.alert(
        "✅ Status aktualisiert",
        `Der Projektstatus wurde auf "${getStatusText(newStatus)}" geändert.`
      );
    } catch (error) {
      console.error("❌ Fehler beim Aktualisieren des Status:", error);
      Alert.alert(
        "❌ Fehler",
        "Der Status konnte nicht geändert werden. Bitte versuchen Sie es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PDF EXPORT FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const generateProjectPDF = async (project: Project) => {
    try {
      setIsLoading(true);

      // HTML-Template für PDF generieren
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Projektbericht - ${project.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 40px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              border-bottom: 3px solid #2196F3;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2196F3;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .section {
              margin-bottom: 30px;
              padding: 20px;
              background-color: #f9f9f9;
              border-left: 4px solid #2196F3;
              border-radius: 4px;
            }
            .section-title {
              font-size: 20px;
              color: #2196F3;
              margin-bottom: 15px;
              font-weight: 600;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .info-item {
              padding: 15px;
              background-color: white;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 24px;
              color: #2196F3;
              font-weight: bold;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              color: white;
              background-color: ${
                project.status === "active"
                  ? "#4CAF50"
                  : project.status === "completed"
                  ? "#2196F3"
                  : "#FF9800"
              };
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            .summary-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .summary-box h2 {
              margin-bottom: 15px;
            }
            .summary-stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            .summary-stat {
              text-align: center;
            }
            .summary-stat-value {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .summary-stat-label {
              font-size: 12px;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 BauLogPro</h1>
            <div class="subtitle">Projektbericht - Erstellt am ${new Date().toLocaleDateString(
              "de-DE",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</div>
          </div>

          <div class="summary-box">
            <h2>${project.name}</h2>
            <div class="status-badge">${getStatusText(project.status)}</div>
            
            <div class="summary-stats">
              <div class="summary-stat">
                <div class="summary-stat-value">${project.totalLength}m</div>
                <div class="summary-stat-label">Gesamtlänge</div>
              </div>
              <div class="summary-stat">
                <div class="summary-stat-value">${project.documentation}</div>
                <div class="summary-stat-label">Dokumentationen</div>
              </div>
              <div class="summary-stat">
                <div class="summary-stat-value">${project.calculations}</div>
                <div class="summary-stat-label">Kalkulationen</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📋 Projektübersicht</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Projekt-ID</div>
                <div class="info-value" style="font-size: 18px;">${
                  project.id
                }</div>
              </div>
              <div class="info-item">
                <div class="info-label">Projektname</div>
                <div class="info-value" style="font-size: 18px;">${
                  project.name
                }</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value" style="font-size: 18px;">${getStatusText(
                  project.status
                )}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Gesamtlänge</div>
                <div class="info-value">${project.totalLength} m</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📊 Detaillierte Statistiken</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">📄 Dokumentationen</div>
                <div class="info-value">${project.documentation}</div>
              </div>
              <div class="info-item">
                <div class="info-label">🧮 Kalkulationen</div>
                <div class="info-value">${project.calculations}</div>
              </div>
              <div class="info-item">
                <div class="info-label">🪖 Sicherheitsmaßnahmen</div>
                <div class="info-value">${project.safetyMeasures}</div>
              </div>
              <div class="info-item">
                <div class="info-label">📏 Durchschn. Länge/Dok</div>
                <div class="info-value">${
                  project.documentation > 0
                    ? (project.totalLength / project.documentation).toFixed(1)
                    : "0"
                } m</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📝 Zusätzliche Informationen</div>
            <p style="margin-top: 10px; line-height: 1.8;">
              Dieses Projekt wurde im BauLogPro-System erfasst und verwaltet. 
              Alle Daten wurden zum Zeitpunkt der PDF-Erstellung aus dem System exportiert.
              <br><br>
              <strong>Projektdetails:</strong><br>
              • Gesamtlänge der Kabeltrassen: ${project.totalLength} Meter<br>
              • Anzahl der erfassten Dokumentationen: ${
                project.documentation
              }<br>
              • Durchgeführte Kalkulationen: ${project.calculations}<br>
              • Implementierte Sicherheitsmaßnahmen: ${
                project.safetyMeasures
              }<br>
            </p>
          </div>

          <div class="footer">
            <p>Erstellt mit BauLogPro - Professionelles Kabelmanagement</p>
            <p>© ${new Date().getFullYear()} - Alle Rechte vorbehalten</p>
            <p style="margin-top: 5px;">Dokument generiert am: ${new Date().toLocaleString(
              "de-DE"
            )}</p>
          </div>
        </body>
        </html>
      `;

      // PDF erstellen
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log("📄 PDF erstellt:", uri);

      // Prüfen ob Sharing verfügbar ist
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        // Direkt die generierte PDF-Datei teilen
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Projektbericht: ${project.name}`,
          UTI: "com.adobe.pdf",
        });

        const fileName = `BauLogPro_${project.name.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${new Date().toISOString().split("T")[0]}.pdf`;

        Alert.alert(
          "✅ PDF erstellt",
          `Der Projektbericht wurde erfolgreich als PDF exportiert.\n\nDateiname: ${fileName}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "❌ Fehler",
          "PDF-Export ist auf diesem Gerät nicht verfügbar."
        );
      }
    } catch (error) {
      console.error("❌ Fehler beim PDF-Export:", error);
      Alert.alert(
        "❌ Export fehlgeschlagen",
        `Der PDF-Export konnte nicht durchgeführt werden.\n\nFehler: ${
          error instanceof Error ? error.message : "Unbekannter Fehler"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const getStatusText = (status: string): string => {
    switch (status) {
      case "active":
        return "Aktiv";
      case "completed":
        return "Abgeschlossen";
      case "pending":
        return "Ausstehend";
      default:
        return status;
    }
  };

  const hasData = dashboardData.projects.length > 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Wrapper>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Header>
          <HeaderTitle>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <HeaderIcon>📊</HeaderIcon>
              <Text
                variant="h1"
                numberOfLines={2}
                style={{ flexShrink: 1, flexWrap: "wrap" }}
              >
                Dashboard
              </Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Schneller Überblick über Projekte und Dokumentationen
          </CardText>
        </Header>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONTENT */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <ScrollContainer
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Error Banner */}
          {error ? (
            <InfoBanner type="error">
              <InfoBannerText>⚠️ {error}</InfoBannerText>
            </InfoBanner>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* NEUES PROJEKT ERSTELLEN */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Card title="➕ Neues Projekt">
            <CardText>
              Erstellen Sie ein neues Projekt, um Messdaten, Fotos,
              Sicherheitsmaßnahmen und Kalkulationen zu erfassen
            </CardText>

            {!showNewProjectForm ? (
              <Button
                variant="primary"
                onPress={() => setShowNewProjectForm(true)}
              >
                ➕ Neues Projekt anlegen
              </Button>
            ) : (
              <View>
                <Input
                  label="📝 Projektname *"
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="z.B. Baustelle Hauptstraße"
                />

                <Input
                  label="📋 Beschreibung (optional)"
                  value={newProjectDescription}
                  onChangeText={setNewProjectDescription}
                  placeholder="Kurze Projektbeschreibung..."
                  multiline
                  numberOfLines={3}
                />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="primary"
                      onPress={handleCreateNewProject}
                      disabled={isLoading}
                    >
                      {isLoading ? "⏳ Erstelle..." : "✅ Projekt erstellen"}
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setShowNewProjectForm(false);
                        setNewProjectName("");
                        setNewProjectDescription("");
                      }}
                      disabled={isLoading}
                    >
                      ❌ Abbrechen
                    </Button>
                  </View>
                </View>

                <InfoBanner type="info" style={{ marginTop: 12 }}>
                  <InfoBannerText>
                    💡 Nach dem Erstellen wird das Projekt automatisch
                    ausgewählt und Sie können sofort mit der Erfassung beginnen.
                  </InfoBannerText>
                </InfoBanner>
              </View>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ZUSAMMENFASSUNG */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Card title="📈 Zusammenfassung">
            <CardText>
              Übersicht aller Projekte mit Gesamtlängen und Ergebnissen
            </CardText>

            <SummaryGrid>
              <SummaryItem>
                <SummaryLabel>Gesamtprojekte</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.totalProjects}
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Aktive Projekte</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.activeProjects}
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Gesamtlänge (m)</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.totalLength.toLocaleString("de-DE")}
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Dokumentationen</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.totalDocumentations}
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Kalkulationen</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.totalCalculations}
                </SummaryValue>
              </SummaryItem>

              <SummaryItem>
                <SummaryLabel>Sicherheitsmaßnahmen</SummaryLabel>
                <SummaryValue>
                  {dashboardData.summary.totalSafetyMeasures}
                </SummaryValue>
              </SummaryItem>
            </SummaryGrid>
          </Card>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FILTER SECTION */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Card title="🔍 Filter & Auswahl">
            {dashboardData.projects.length > 0 ? (
              <Select
                label="📋 Projekt auswählen"
                placeholder="Projekt auswählen..."
                options={dashboardData.projects.map((project) => ({
                  label: `${project.name} (${getStatusText(project.status)})`,
                  value: project.id,
                }))}
                selectedValue={selectedProject}
                onSelect={(value) => {
                  setSelectedProject(value);
                  saveToStorage(STORAGE_KEYS.selectedProject, value);
                }}
              />
            ) : (
              <CardText style={{ marginBottom: 12 }}>
                Keine Projekte verfügbar. Bitte laden Sie Daten.
              </CardText>
            )}

            <Button
              variant="primary"
              onPress={handleProjectSelection}
              disabled={!selectedProject}
            >
              ✅ Details anzeigen
            </Button>

            <Button
              variant="secondary"
              onPress={() => {
                console.log("🧪 Test-Button wurde geklickt!");
                Alert.alert("🧪 Button Test", "Der Button funktioniert!");

                // Async Funktion separat aufrufen
                (async () => {
                  try {
                    console.log("🧪 Test: Speichere Test-Projekt");
                    await saveSelectedProject({
                      id: "test-123",
                      name: "Test Projekt",
                      status: "active",
                    });
                    console.log("✅ Test-Projekt gespeichert");
                    Alert.alert(
                      "✅ Test erfolgreich",
                      "Die Funktion funktioniert!"
                    );
                  } catch (error) {
                    console.error("❌ Test fehlgeschlagen:", error);
                    Alert.alert("❌ Test fehlgeschlagen", String(error));
                  }
                })();
              }}
            >
              🧪 Test Projekt-Auswahl
            </Button>

            <Button
              variant="secondary"
              onPress={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "🔼 Filter ausblenden" : "🔽 Erweiterte Filter"}
            </Button>

            {showFilters && (
              <ExpandableSection>
                <InfoBanner type="info">
                  <InfoBannerText>
                    💡 Erweiterte Filteroptionen werden in einer zukünftigen
                    Version verfügbar sein.
                  </InfoBannerText>
                </InfoBanner>
              </ExpandableSection>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PROJEKT LISTE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {hasData ? (
            <Card title="📁 Aktive Projekte">
              <CardText>
                Liste aller Projekte mit Details (zum Erweitern antippen)
              </CardText>

              {dashboardData.projects.map((project) => (
                <ProjectListItem key={project.id}>
                  <ProjectHeader>
                    <ProjectName>{project.name}</ProjectName>
                    <ProjectStatus status={project.status}>
                      <ProjectStatusText>
                        {getStatusText(project.status)}
                      </ProjectStatusText>
                    </ProjectStatus>
                  </ProjectHeader>

                  <ProjectDetails>
                    📏 Länge: {project.totalLength}m | 📄 Dok:{" "}
                    {project.documentation}
                  </ProjectDetails>

                  <ExpandButton onPress={() => toggleProjectExpand(project.id)}>
                    <ExpandButtonText>
                      {expandedProjects.has(project.id)
                        ? "▼ Details ausblenden"
                        : "▶ Details anzeigen"}
                    </ExpandButtonText>
                  </ExpandButton>

                  {expandedProjects.has(project.id) ? (
                    <ExpandableSection>
                      <SummaryItem>
                        <SummaryLabel>Gesamtlänge</SummaryLabel>
                        <SummaryValue>{project.totalLength}m</SummaryValue>
                      </SummaryItem>

                      <SummaryItem>
                        <SummaryLabel>Dokumentationen</SummaryLabel>
                        <SummaryValue>{project.documentation}</SummaryValue>
                      </SummaryItem>

                      <SummaryItem>
                        <SummaryLabel>Kalkulationen</SummaryLabel>
                        <SummaryValue>{project.calculations}</SummaryValue>
                      </SummaryItem>

                      <SummaryItem>
                        <SummaryLabel>Sicherheitsmaßnahmen</SummaryLabel>
                        <SummaryValue>{project.safetyMeasures}</SummaryValue>
                      </SummaryItem>

                      <View style={{ gap: 8 }}>
                        <Button
                          variant="primary"
                          onPress={() => {
                            console.log(
                              "🔄 Button geklickt für Projekt:",
                              project.name
                            );

                            // Async Funktion separat aufrufen
                            (async () => {
                              try {
                                console.log(
                                  "🔄 Starte Projekt-Auswahl:",
                                  project.name
                                );

                                await saveSelectedProject({
                                  id: project.id,
                                  name: project.name,
                                  status: project.status,
                                });

                                console.log(
                                  "✅ Projekt erfolgreich gespeichert"
                                );

                                Alert.alert(
                                  "✅ Projekt ausgewählt",
                                  `"${project.name}" wurde als aktives Projekt gesetzt.\n\n📋 Sie können es jetzt in den anderen Tabs bearbeiten.`,
                                  [
                                    {
                                      text: "OK",
                                      onPress: () =>
                                        console.log(
                                          "✅ Benutzer hat bestätigt"
                                        ),
                                    },
                                  ]
                                );
                              } catch (error) {
                                console.error(
                                  "❌ Fehler beim Auswählen:",
                                  error
                                );
                                Alert.alert(
                                  "❌ Fehler",
                                  `Das Projekt konnte nicht ausgewählt werden.\n\nFehler: ${
                                    error instanceof Error
                                      ? error.message
                                      : "Unbekannt"
                                  }`
                                );
                              }
                            })();
                          }}
                        >
                          ✅ Projekt auswählen
                        </Button>

                        <Button
                          variant="secondary"
                          onPress={() => handleChangeProjectStatus(project)}
                        >
                          📊 Status ändern
                        </Button>

                        <Button
                          variant="secondary"
                          onPress={() => generateProjectPDF(project)}
                        >
                          📄 Als PDF exportieren
                        </Button>

                        <Button
                          variant="secondary"
                          onPress={() => {
                            const projectInfo = `Projekt: ${project.name}\nStatus: ${project.status}\nGesamtlänge: ${project.totalLength}m\nDokumentationen: ${project.documentation}\nKalkulationen: ${project.calculations}\nSicherheitsmaßnahmen: ${project.safetyMeasures}`;
                            Clipboard.setString(projectInfo);
                            Alert.alert(
                              "✅ Kopiert",
                              "Projektinformationen wurden kopiert."
                            );
                          }}
                        >
                          📋 In Zwischenablage kopieren
                        </Button>
                      </View>
                    </ExpandableSection>
                  ) : null}
                </ProjectListItem>
              ))}
            </Card>
          ) : (
            /* ═══════════════════════════════════════════════════════════ */
            /* EMPTY STATE */
            /* ═══════════════════════════════════════════════════════════ */
            <EmptyState>
              <EmptyStateIcon>📭</EmptyStateIcon>
              <EmptyStateText>
                Keine Projekte verfügbar.{"\n"}
                Ziehen Sie nach unten, um zu aktualisieren.
              </EmptyStateText>
            </EmptyState>
          )}

          {/* Abstand am Ende */}
          <View style={{ height: 100 }} />
        </ScrollContainer>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER ACTIONS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FooterActions>
          <Button
            variant="primary"
            onPress={loadRealProjects}
            disabled={isLoading}
          >
            🔄 Daten aktualisieren
          </Button>
          <Button
            variant="danger"
            onPress={async () => {
              Alert.alert(
                "⚠️ Alle Projekte löschen",
                "Sind Sie sicher, dass Sie ALLE Projekte unwiderruflich löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden!",
                [
                  {
                    text: "Abbrechen",
                    style: "cancel",
                  },
                  {
                    text: "Ja, löschen!",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        setIsLoading(true);
                        for (const p of dashboardData.projects) {
                          await deleteProjectData(p.id);
                        }
                        await loadRealProjects();
                        Alert.alert(
                          "✅ Alle Projekte gelöscht",
                          "Das Dashboard ist jetzt leer."
                        );
                      } catch (error) {
                        Alert.alert("❌ Fehler beim Löschen", String(error));
                      } finally {
                        setIsLoading(false);
                      }
                    },
                  },
                ]
              );
            }}
            disabled={isLoading || dashboardData.projects.length === 0}
          >
            🗑️ Alle Projekte löschen
          </Button>
        </FooterActions>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOADING OVERLAY */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <LoadingOverlay>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", marginTop: 16 }}>
              Lädt Dashboard-Daten...
            </Text>
          </LoadingOverlay>
        ) : null}
      </Wrapper>
    </SafeAreaView>
  );
}
