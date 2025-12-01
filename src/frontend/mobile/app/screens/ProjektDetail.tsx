/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📁 PROJEKT DETAIL - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Zentrale Ansicht mit allen relevanten Informationen zu einem Projekt
 *
 * Beschreibung:
 * Der ProjektDetail-View ermöglicht eine umfassende Einsicht in einzelne
 * Projekte. Nutzer können Details zu Abschnitten, Messdaten und spezifischen
 * Anforderungen der Baustelle einsehen und erfassen. Der View unterstützt
 * präzise Dokumentation und Nachvollziehbarkeit der Tätigkeiten.
 *
 * Features:
 * - Projektverwaltung mit Name und Beschreibung
 * - Messdaten-Übersicht
 * - Anhänge und Dokumentation
 * - Offline-Entwürfe (AsyncStorage)
 * - Clipboard-Unterstützung
 * - Pull-to-Refresh
 * - Notion-Sync (optional)
 * - Auto-Label-Generierung
 * - Expandable Sections
 *
 * Zielgruppe: Projektmanager, Bautechniker, weitere Projektbeteiligte
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  RefreshControl,
  SafeAreaView,
  View,
} from "react-native";
import styled from "styled-components/native";
import { Button, Card, CardText, Input, Text } from "../components";
import type { AppTheme } from "../themes";
import { getStorageMode } from "../utils/dataStorage";
import {
  loadProjectData,
  saveProjectData,
  saveProjectDataLocally, // Importieren Sie die neue Funktion
  type CompleteProjektData,
} from "../utils/projectDataManager";
import {
  getSelectedProject,
  setSelectedProject as saveSelectedProject,
} from "../utils/selectedProject";
// Unterviews importieren
import FotoDokumentation from "./FotoDokumentation";
import Kalkulation from "./Kalkulation";
import MessdatenErfassung from "./MessdatenErfassung";
import Sicherheitsmassnahmen from "./Sicherheitsmassnahmen";

// Unterviews importieren

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface Messdaten {
  id: string;
  type: string;
  value: string;
  unit?: string;
  timestamp: string;
  notizen?: string;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

interface ProjektDetails {
  id: string;
  projektName: string;
  projektBeschreibung: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  personalId: string;
  messdaten: Messdaten[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  status: "success" | "error";
  message?: string;
  data?: ProjektDetails;
}

// ═══════════════════════════════════════════════════════════════════════════
// API KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════

const PROJEKT_CREATE_URL =
  "https://n8n.cloudforming.de/webhook/projektDetail-create";
const PROJEKT_UPDATE_URL =
  "https://n8n.cloudforming.de/webhook/projektDetail-update";
const PROJEKT_LIST_URL =
  "https://n8n.cloudforming.de/webhook/projektDetail-list";
const PROJEKT_DELETE_API_URL = "https://api.cloudforming.de/api/projekte";
const HOOK_SECRET = "MY_SUPER_SECRET";

// API-Konstanten für Sammel-Speichern
const PROJEKT_KOMPLETT_URL = "https://api.cloudforming.de/api/projekte"; // Angenommen, Ihr Server läuft lokal auf Port 3001

// ═══════════════════════════════════════════════════════════════════════════
// ASYNCSTORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  draft: "@ProjektDetail:draft",
  data: "@ProjektDetail:data",
  lastSync: "@ProjektDetail:lastSync",
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
  background-color: ${({ type }) =>
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

const FormSection = styled.View<{ theme: AppTheme }>`
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const TextArea = styled.TextInput<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  min-height: 120px;
  text-align-vertical: top;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
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

const ListItem = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const ListItemHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const ListItemTitle = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  flex: 1;
`;

const ListItemSubtitle = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.small}px;
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

const ExpandableSection = styled.View<{ theme: AppTheme }>`
  margin-top: ${({ theme }) => theme.spacing.sm}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.border};
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

const Label = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.body}px;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

// Hilfsfunktion: HTML-String als reinen Text anzeigen
const renderHtmlAsText = (html: string) => (
  <Text selectable style={{ fontSize: 12, color: "#444" }}>
    {html}
  </Text>
);

// Hilfsfunktion: Wert immer als <Text> rendern
function SafeText({ value, style }) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number") {
    return <Text style={style}>{value}</Text>;
  }
  return value;
}

// Beispielhafte Korrektur für dynamische Textausgaben in <View>
//
// Vorher (fehlerhaft):
// <View>{projektDetails.projektName}</View>
//
// Nachher (korrekt):
// <View><SafeText value={projektDetails.projektName} /></View>
//
// Wende dies für alle dynamischen Werte in <View> an!

// Automatische Korrektur: Alle dynamischen Werte in <View> werden mit <SafeText> gewrappt
// Beispiel:
// <View>{variable}</View> => <View><SafeText value={variable} /></View>
//
// Wende dies für alle dynamischen Werte in <View> an!

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export default function ProjektDetail() {
  // Projekt löschen
  const handleDeleteProject = async () => {
    const projectId = completeProjektData?.stammdaten?.id || projektDetails?.id;
    console.log("[Projekt löschen] Verwendete Projekt-ID:", projectId);
    if (!projectId) {
      Alert.alert(
        "❌ Kein Projekt ausgewählt",
        "Es ist kein Projekt zum Löschen vorhanden.\nID: " + String(projectId)
      );
      return;
    }
    Alert.alert(
      "Projekt löschen",
      `Möchten Sie dieses Projekt wirklich unwiderruflich löschen?\nID: ${projectId}`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            setError("");
            setSuccessMessage("");
            try {
              console.log(
                "[Projekt löschen] Sende DELETE an:",
                `${PROJEKT_DELETE_API_URL}/${projectId}`
              );
              // API-Request an die richtige Backend-URL
              const response = await fetch(
                `${PROJEKT_DELETE_API_URL}/${projectId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                }
              );
              if (response.ok) {
                setSuccessMessage("Projekt erfolgreich gelöscht.");
                setProjektDetails(null);
                setCompleteProjektData(null);
                await AsyncStorage.removeItem(STORAGE_KEYS.data);
                await AsyncStorage.removeItem(STORAGE_KEYS.draft);
                // Auch lokal entfernen
                try {
                  const { deleteProjectDataLocally } = await import(
                    "../utils/projectDataManager"
                  );
                  await deleteProjectDataLocally(projectId);
                  console.log("[Projekt löschen] Lokal entfernt:", projectId);
                } catch (err) {
                  console.error(
                    "[Projekt löschen] Fehler beim lokalen Entfernen:",
                    err
                  );
                }
              } else {
                const errorText = await response.text();
                setError(
                  `❌ Fehler beim Löschen.\nServerantwort: ${errorText}\nID: ${projectId}`
                );
                console.error("[Projekt löschen] Fehler:", errorText);
              }
            } catch (error) {
              let errorMessage = `❌ Fehler beim Löschen des Projekts.\nID: ${projectId}`;
              if (error instanceof Error) {
                errorMessage += " " + error.message;
              }
              setError(errorMessage);
              console.error("[Projekt löschen] Exception:", error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showEmptyState, setShowEmptyState] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Formular State
  const [projektName, setProjektName] = useState<string>("");
  const [projektBeschreibung, setProjektBeschreibung] = useState<string>("");
  const [projektStatus, setProjektStatus] = useState<
    "active" | "completed" | "pending"
  >("active");
  const [strasse, setStrasse] = useState<string>("");
  const [hausnummer, setHausnummer] = useState<string>("");
  const [plz, setPlz] = useState<string>("");
  const [ort, setOrt] = useState<string>("");
  const [personalId, setPersonalId] = useState<string>("");

  // Daten State
  const [projektDetails, setProjektDetails] = useState<ProjektDetails | null>(
    null
  );
  const [messdaten, setMessdaten] = useState<Messdaten[]>([]);
  const [completeProjektData, setCompleteProjektData] =
    useState<CompleteProjektData | null>(null);

  // GPS & Map State
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    loadStoredData();
    loadDraft();
    loadSelectedProjectFromDashboard();
  }, []);

  // Auto-Save Draft
  useEffect(() => {
    const saveDraft = async () => {
      if (
        projektName ||
        projektBeschreibung ||
        strasse ||
        hausnummer ||
        plz ||
        ort ||
        personalId
      ) {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.draft,
            JSON.stringify({
              projektName,
              projektBeschreibung,
              strasse,
              hausnummer,
              plz,
              ort,
              personalId,
            })
          );
        } catch (error) {
          console.error("❌ Fehler beim Speichern des Entwurfs:", error);
        }
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    projektName,
    projektBeschreibung,
    strasse,
    hausnummer,
    plz,
    ort,
    personalId,
  ]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ASYNCSTORAGE FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadStoredData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.data);
      if (storedData) {
        const data = JSON.parse(storedData);
        setProjektDetails(data);
        setProjektName(data.projektName || "");
        setProjektBeschreibung(data.projektBeschreibung || "");
        setStrasse(data.strasse || "");
        setHausnummer(data.hausnummer || "");
        setPlz(data.plz || "");
        setOrt(data.ort || "");
        setPersonalId(data.personalId || "");
        setMessdaten(data.messdaten || []);
        setShowEmptyState(false);
      } else {
        setShowEmptyState(true);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden der gespeicherten Daten:", error);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEYS.draft);
      if (draft) {
        const {
          projektName: draftName,
          projektBeschreibung: draftDesc,
          strasse: draftStrasse,
          hausnummer: draftHausnummer,
          plz: draftPlz,
          ort: draftOrt,
          personalId: draftPersonalId,
        } = JSON.parse(draft);
        if (draftName && !projektName) setProjektName(draftName);
        if (draftDesc && !projektBeschreibung)
          setProjektBeschreibung(draftDesc);
        if (draftStrasse && !strasse) setStrasse(draftStrasse);
        if (draftHausnummer && !hausnummer) setHausnummer(draftHausnummer);
        if (draftPlz && !plz) setPlz(draftPlz);
        if (draftOrt && !ort) setOrt(draftOrt);
        if (draftPersonalId && !personalId) setPersonalId(draftPersonalId);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden des Entwurfs:", error);
    }
  };

  const saveToStorage = async (data: ProjektDetails) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.data, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEYS.lastSync,
        new Date().toISOString()
      );
    } catch (error) {
      console.error("❌ Fehler beim Speichern:", error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.draft);
    } catch (error) {
      console.error("❌ Fehler beim Löschen des Entwurfs:", error);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUSGEWÄHLTES PROJEKT VOM DASHBOARD LADEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadSelectedProjectFromDashboard = async () => {
    try {
      const selectedProject = await getSelectedProject();
      if (selectedProject) {
        console.log("📋 Ausgewähltes Projekt geladen:", selectedProject.name);

        // Lade vollständige Projektdaten
        await loadCompleteProjectData(selectedProject.id);

        // Zeige Info-Banner, dass ein Projekt ausgewählt wurde
        Alert.alert(
          "📋 Projekt geladen",
          `Das Projekt "${selectedProject.name}" wurde aus dem Dashboard geladen.\n\n` +
            `Status: ${getStatusText(selectedProject.status)}\n\n` +
            `Sie können nun die Projektdaten bearbeiten oder neue Messdaten hinzufügen.`,
          [
            {
              text: "Projekt übernehmen",
              onPress: () => {
                setProjektName(selectedProject.name);
                setProjektStatus(selectedProject.status);
              },
            },
            {
              text: "Abbrechen",
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden des ausgewählten Projekts:", error);
    }
  };

  /**
   * Lädt die vollständigen Projektdaten (Messdaten, Fotos, Sicherheit, etc.)
   */
  const loadCompleteProjectData = async (projectId: string) => {
    try {
      console.log("📦 Lade vollständige Projektdaten für ID:", projectId);
      const projectData = await loadProjectData(projectId);

      if (projectData) {
        setCompleteProjektData(projectData);
        console.log("✅ Vollständige Projektdaten geladen:", {
          messdaten: projectData.messdaten.length,
          fotos: projectData.fotos.length,
          sicherheit: projectData.sicherheit.length,
          kalkulationen: projectData.kalkulationen.length,
        });
      } else {
        console.log("ℹ️ Keine gespeicherten Projektdaten gefunden");
        setCompleteProjektData(null);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden der Projektdaten:", error);
      setCompleteProjektData(null);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    setError("");

    if (!projektName.trim()) {
      setError("Bitte geben Sie einen Projektnamen ein.");
      return false;
    }

    if (projektName.trim().length < 3) {
      setError("Der Projektname muss mindestens 3 Zeichen lang sein.");
      return false;
    }

    if (!projektBeschreibung.trim()) {
      setError("Bitte geben Sie eine Projektbeschreibung ein.");
      return false;
    }

    if (projektBeschreibung.trim().length < 10) {
      setError("Die Beschreibung muss mindestens 10 Zeichen lang sein.");
      return false;
    }

    if (!strasse.trim()) {
      setError("Bitte geben Sie eine Straße ein.");
      return false;
    }

    if (!hausnummer.trim()) {
      setError("Bitte geben Sie eine Hausnummer ein.");
      return false;
    }

    if (!plz.trim()) {
      setError("Bitte geben Sie eine PLZ ein.");
      return false;
    }

    if (plz.trim().length < 4 || plz.trim().length > 5) {
      setError("Die PLZ muss 4-5 Zeichen lang sein.");
      return false;
    }

    if (!ort.trim()) {
      setError("Bitte geben Sie einen Ort ein.");
      return false;
    }

    if (ort.trim().length < 2) {
      setError("Der Ort muss mindestens 2 Zeichen lang sein.");
      return false;
    }

    if (!personalId.trim()) {
      setError("Bitte geben Sie eine Personal-ID ein.");
      return false;
    }

    if (personalId.trim().length < 3) {
      setError("Die Personal-ID muss mindestens 3 Zeichen lang sein.");
      return false;
    }

    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    let serverError = null; // Variable, um Server-Fehler zu speichern

    // Stammdaten sammeln
    const projektId =
      completeProjektData?.stammdaten?.id || Date.now().toString();
    const stammdaten = {
      id: projektId,
      projektName: projektName.trim(),
      projektBeschreibung: projektBeschreibung.trim(),
      status: projektStatus,
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim(),
      plz: plz.trim(),
      ort: ort.trim(),
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      personalId: personalId.trim(),
      createdAt:
        completeProjektData?.stammdaten?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Alle Teilbereiche sammeln
    const vollstaendigeProjektDaten: CompleteProjektData = {
      stammdaten,
      fotos: completeProjektData?.fotos || [],
      messdaten: completeProjektData?.messdaten || [],
      sicherheit: completeProjektData?.sicherheit || [],
      kalkulationen: completeProjektData?.kalkulationen || [],
      version: "1.1.1", // oder eine dynamische Version
    };

    // Prüfen, ob das Projekt existiert (API-GET)
    let isUpdate = false;
    try {
      const checkUrl = `${PROJEKT_KOMPLETT_URL}/${projektId}`;
      const checkResponse = await fetch(checkUrl, { method: "GET" });
      if (checkResponse.ok) {
        isUpdate = true;
        setSuccessMessage(
          `ℹ️ Projekt mit ID ${projektId} gefunden. Es wird ein Update (PUT) ausgeführt.`
        );
      } else {
        isUpdate = false;
        setSuccessMessage(
          `ℹ️ Projekt mit ID ${projektId} nicht gefunden. Es wird ein neues Projekt angelegt (POST).`
        );
      }
    } catch (e) {
      isUpdate = false;
      setSuccessMessage(
        `ℹ️ Projekt-Existenz konnte nicht geprüft werden. Es wird ein neues Projekt angelegt (POST).`
      );
    }

    try {
      const mode = await getStorageMode();
      console.log(`[ProjektDetail] Speicher-Modus: ${mode}`);

      if (mode === "database") {
        const method = isUpdate ? "PUT" : "POST";
        const url = isUpdate
          ? `${PROJEKT_KOMPLETT_URL}/${projektId}`
          : PROJEKT_KOMPLETT_URL;

        console.log(`[ProjektDetail] Sende ${method} an ${url}`);

        try {
          const response = await fetch(url, {
            method: method,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(vollstaendigeProjektDaten),
          });

          if (response.ok) {
            const result = await response.json();
            setSuccessMessage(
              result?.message
                ? `✅ Übertragung erfolgreich: ${result.message}`
                : "✅ Projekt und alle Teilbereiche erfolgreich in die Datenbank übertragen!"
            );
          } else {
            const errorText = await response.text();
            serverError = `❌ Fehler bei der Übertragung in die Datenbank.\nServerantwort: ${errorText}`;
            setError(serverError);
          }
        } catch (e) {
          serverError = `❌ Netzwerkfehler: ${
            e instanceof Error ? e.message : String(e)
          }`;
          setError(serverError);
        }
      }

      // Lokales Speichern (immer, aber besonders als Backup bei Server-Fehler)
      if (mode === "local" || serverError) {
        await saveProjectDataLocally(vollstaendigeProjektDaten);
        if (serverError) {
          setSuccessMessage(
            "💾 Server nicht erreichbar. Projekt wurde sicher lokal gespeichert."
          );
        } else {
          setSuccessMessage("💾 Projekt wurde erfolgreich lokal gespeichert.");
        }
      }

      // Update state
      setCompleteProjektData(vollstaendigeProjektDaten);
      // Optional: Formular zurücksetzen oder Draft löschen
      await clearDraft();
    } catch (error) {
      // Dieser Catch-Block fängt jetzt hauptsächlich Fehler von getStorageMode oder saveProjectDataLocally
      const errorMessage = `❌ Ein unerwarteter Fehler ist aufgetreten: ${
        error instanceof Error ? error.message : String(error)
      }`;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "🚫 Abbrechen",
      "Möchten Sie wirklich abbrechen? Ungespeicherte Änderungen gehen verloren.",
      [
        { text: "Nein", style: "cancel" },
        {
          text: "Ja, abbrechen",
          style: "destructive",
          onPress: () => {
            setProjektName(projektDetails?.projektName || "");
            setProjektBeschreibung(projektDetails?.projektBeschreibung || "");
            setStrasse(projektDetails?.strasse || "");
            setHausnummer(projektDetails?.hausnummer || "");
            setPlz(projektDetails?.plz || "");
            setOrt(projektDetails?.ort || "");
            setPersonalId(projektDetails?.personalId || "");
            clearDraft();
          },
        },
      ]
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HILFSFUNKTIONEN ZUM HINZUFÜGEN VON DATEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fügt neue Messdaten zum Projekt hinzu und speichert sofort
   */
  const addMessdaten = async (
    type: string,
    value: string,
    unit?: string,
    notizen?: string
  ) => {
    if (!completeProjektData) {
      Alert.alert("⚠️ Kein Projekt", "Bitte erstellen Sie zuerst ein Projekt.");
      return;
    }

    const neueMessung = {
      id: Date.now().toString(),
      type,
      value,
      unit,
      timestamp: new Date().toISOString(),
      notizen,
    };

    const aktualisiertesDaten: CompleteProjektData = {
      ...completeProjektData,
      messdaten: [...completeProjektData.messdaten, neueMessung],
      stammdaten: {
        ...completeProjektData.stammdaten,
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await saveProjectData(aktualisiertesDaten);
      setCompleteProjektData(aktualisiertesDaten);
      console.log("✅ Messdaten hinzugefügt:", neueMessung);
      Alert.alert("✅ Erfolg", "Messdaten wurden hinzugefügt");
    } catch (error) {
      console.error("❌ Fehler beim Hinzufügen von Messdaten:", error);
      Alert.alert("❌ Fehler", "Messdaten konnten nicht gespeichert werden");
    }
  };

  /**
   * Fügt ein Foto zum Projekt hinzu und speichert sofort
   */
  const addFoto = async (
    uri: string,
    beschreibung?: string,
    typ?: "Baufortschritt" | "Schaden" | "Sonstiges"
  ) => {
    if (!completeProjektData) {
      Alert.alert("⚠️ Kein Projekt", "Bitte erstellen Sie zuerst ein Projekt.");
      return;
    }

    const neuesFoto = {
      id: Date.now().toString(),
      uri,
      beschreibung,
      typ,
      timestamp: new Date().toISOString(),
    };

    const aktualisiertesDaten: CompleteProjektData = {
      ...completeProjektData,
      fotos: [...completeProjektData.fotos, neuesFoto],
      stammdaten: {
        ...completeProjektData.stammdaten,
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      const mode = await getStorageMode();
      console.log(`💾 [ProjektDetail] Speichern-Button: Modus ist '${mode}'`);
      await saveProjectData(aktualisiertesDaten);
      setCompleteProjektData(aktualisiertesDaten);
      console.log("✅ Foto hinzugefügt:", neuesFoto);
      Alert.alert("✅ Erfolg", "Foto wurde hinzugefügt");
    } catch (error) {
      console.error("❌ Fehler beim Hinzufügen von Foto:", error);
      Alert.alert("❌ Fehler", "Foto konnte nicht gespeichert werden");
    }
  };

  /**
   * Fügt eine Sicherheitsmaßnahme zum Projekt hinzu und speichert sofort
   */
  const addSicherheitsmassnahme = async (
    massnahme: string,
    status: "geplant" | "durchgeführt" | "überprüft",
    verantwortlich?: string,
    notizen?: string
  ) => {
    if (!completeProjektData) {
      Alert.alert("⚠️ Kein Projekt", "Bitte erstellen Sie zuerst ein Projekt.");
      return;
    }

    const neueMassnahme = {
      id: Date.now().toString(),
      massnahme,
      status,
      verantwortlich,
      datum: new Date().toISOString(),
      notizen,
    };

    const aktualisiertesDaten: CompleteProjektData = {
      ...completeProjektData,
      sicherheit: [...completeProjektData.sicherheit, neueMassnahme],
      stammdaten: {
        ...completeProjektData.stammdaten,
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await saveProjectData(aktualisiertesDaten);
      setCompleteProjektData(aktualisiertesDaten);
      console.log("✅ Sicherheitsmaßnahme hinzugefügt:", neueMassnahme);
      Alert.alert("✅ Erfolg", "Sicherheitsmaßnahme wurde hinzugefügt");
    } catch (error) {
      console.error(
        "❌ Fehler beim Hinzufügen von Sicherheitsmaßnahme:",
        error
      );
      Alert.alert(
        "❌ Fehler",
        "Sicherheitsmaßnahme konnte nicht gespeichert werden"
      );
    }
  };

  /**
   * Fügt eine Kalkulation zum Projekt hinzu und speichert sofort
   */
  const addKalkulation = async (
    position: string,
    menge: number,
    einheit: string,
    einzelpreis: number,
    notizen?: string
  ) => {
    if (!completeProjektData) {
      Alert.alert("⚠️ Kein Projekt", "Bitte erstellen Sie zuerst ein Projekt.");
      return;
    }

    const neueKalkulation = {
      id: Date.now().toString(),
      position,
      menge,
      einheit,
      einzelpreis,
      gesamtpreis: menge * einzelpreis,
      notizen,
      timestamp: new Date().toISOString(),
    };

    const aktualisiertesDaten: CompleteProjektData = {
      ...completeProjektData,
      kalkulationen: [...completeProjektData.kalkulationen, neueKalkulation],
      stammdaten: {
        ...completeProjektData.stammdaten,
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await saveProjectData(aktualisiertesDaten);
      setCompleteProjektData(aktualisiertesDaten);
      console.log("✅ Kalkulation hinzugefügt:", neueKalkulation);
      Alert.alert("✅ Erfolg", "Kalkulation wurde hinzugefügt");
    } catch (error) {
      console.error("❌ Fehler beim Hinzufügen von Kalkulation:", error);
      Alert.alert("❌ Fehler", "Kalkulation konnte nicht gespeichert werden");
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GPS & GEOCODING FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // GPS-Berechtigung anfragen
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "❌ Berechtigung verweigert",
          "Bitte erlauben Sie den Zugriff auf den Standort in den Einstellungen."
        );
        setIsLoadingLocation(false);
        return;
      }

      // Aktuelle Position abrufen
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse Geocoding - Koordinaten in Adresse umwandeln
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];

        // Adressfelder automatisch ausfüllen
        if (address.street) setStrasse(address.street);
        if (address.streetNumber) setHausnummer(address.streetNumber);
        if (address.postalCode) setPlz(address.postalCode);
        if (address.city) setOrt(address.city);

        Alert.alert(
          "✅ Standort ermittelt",
          `Adresse wurde automatisch ausgefüllt:\n${address.street || ""} ${
            address.streetNumber || ""
          }\n${address.postalCode || ""} ${address.city || ""}`,
          [
            { text: "Karte öffnen", onPress: () => setShowMapModal(true) },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert(
          "⚠️ Keine Adresse gefunden",
          "Für diese Koordinaten konnte keine Adresse ermittelt werden. Sie können die Karte öffnen und manuell auswählen.",
          [
            { text: "Karte öffnen", onPress: () => setShowMapModal(true) },
            { text: "Abbrechen", style: "cancel" },
          ]
        );
      }
    } catch (error) {
      console.error("❌ GPS Fehler:", error);
      Alert.alert(
        "❌ Standort-Fehler",
        "Der Standort konnte nicht ermittelt werden. Bitte stellen Sie sicher, dass GPS aktiviert ist."
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleOpenInMaps = () => {
    if (!currentLocation) {
      Alert.alert(
        "❌ Kein Standort",
        "Bitte ermitteln Sie zuerst den Standort."
      );
      return;
    }

    const { latitude, longitude } = currentLocation;
    const label =
      strasse && hausnummer ? `${strasse} ${hausnummer}` : "Projektstandort";

    // Google Maps öffnen
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(
      label
    )}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("❌ Fehler", "Karte konnte nicht geöffnet werden.");
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLIPBOARD & HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleCopyToClipboard = () => {
    if (!projektDetails) return;

    const adresse = `${projektDetails.strasse} ${projektDetails.hausnummer}, ${projektDetails.plz} ${projektDetails.ort}`;
    const text = `Projekt: ${projektDetails.projektName}\n\nAdresse:\n${adresse}\n\nBeschreibung:\n${projektDetails.projektBeschreibung}\n\nMessdaten: ${projektDetails.messdaten.length}\nAnhänge: ${projektDetails.attachments.length}`;
    Clipboard.setString(text);
    Alert.alert(
      "✅ Kopiert",
      "Projektdetails wurden in die Zwischenablage kopiert."
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATUS ÄNDERN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleChangeStatus = () => {
    Alert.alert(
      "📊 Projektstatus ändern",
      `Aktueller Status: ${getStatusText(
        projektStatus
      )}\n\nWählen Sie einen neuen Status:`,
      [
        {
          text: "🟢 Aktiv",
          onPress: () => updateStatus("active"),
        },
        {
          text: "🔵 Abgeschlossen",
          onPress: () => updateStatus("completed"),
        },
        {
          text: "🟠 Ausstehend",
          onPress: () => updateStatus("pending"),
        },
        {
          text: "Abbrechen",
          style: "cancel",
        },
      ]
    );
  };

  const updateStatus = async (
    newStatus: "active" | "completed" | "pending"
  ) => {
    try {
      setProjektStatus(newStatus);

      // Auch im ausgewählten Projekt aktualisieren
      const selected = await getSelectedProject();
      if (selected) {
        await saveSelectedProject({
          id: selected.id,
          name: selected.name,
          status: newStatus,
        });
      }

      Alert.alert(
        "✅ Status aktualisiert",
        `Der Projektstatus wurde auf "${getStatusText(newStatus)}" geändert.`
      );
    } catch (error) {
      console.error("❌ Fehler beim Aktualisieren des Status:", error);
      Alert.alert("❌ Fehler", "Der Status konnte nicht geändert werden.");
    }
  };

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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PDF EXPORT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const generatePDF = async () => {
    try {
      setIsLoading(true);

      // Verwende vollständige Projektdaten wenn vorhanden
      const projektDaten = completeProjektData || null;
      const messdatenListe = projektDaten?.messdaten || messdaten;
      const fotosListe = projektDaten?.fotos || [];
      const sicherheitListe = projektDaten?.sicherheit || [];
      const kalkulationenListe = projektDaten?.kalkulationen || [];

      // Berechne Gesamtsumme der Kalkulationen
      const gesamtsumme = kalkulationenListe.reduce(
        (sum, k) => sum + k.gesamtpreis,
        0
      );

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Projektbericht - ${projektName}</title>
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
              page-break-inside: avoid;
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
              font-size: 16px;
              color: #333;
              font-weight: 600;
            }
            .status-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              color: white;
              background-color: ${
                projektStatus === "active"
                  ? "#4CAF50"
                  : projektStatus === "completed"
                  ? "#2196F3"
                  : "#FF9800"
              };
            }
            .data-item {
              padding: 12px;
              background: white;
              margin-bottom: 10px;
              border-radius: 4px;
              border: 1px solid #e0e0e0;
            }
            .data-item-title {
              font-weight: 600;
              color: #333;
              margin-bottom: 5px;
            }
            .data-item-detail {
              font-size: 14px;
              color: #666;
              margin-top: 3px;
            }
            .summary-box {
              background: #e3f2fd;
              padding: 15px;
              border-radius: 4px;
              margin-top: 15px;
              border: 2px solid #2196F3;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #bbdefb;
            }
            .summary-item:last-child {
              border-bottom: none;
              font-weight: 600;
              font-size: 18px;
              margin-top: 10px;
              padding-top: 15px;
              border-top: 2px solid #2196F3;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              background: white;
            }
            .table th,
            .table td {
              padding: 12px;
              text-align: left;
              border: 1px solid #e0e0e0;
            }
            .table th {
              background-color: #2196F3;
              color: white;
              font-weight: 600;
            }
            .table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 BauLogPro</h1>
            <div class="subtitle">Vollständiger Projektbericht - Erstellt am ${new Date().toLocaleDateString(
              "de-DE",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}</div>
          </div>

          <div class="section">
            <h2>${projektName}</h2>
            <div class="status-badge">${getStatusText(projektStatus)}</div>
          </div>

          <!-- PROJEKTINFORMATIONEN -->
          <div class="section">
            <div class="section-title">📋 Projektinformationen</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Projektname</div>
                <div class="info-value">${projektName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">${getStatusText(projektStatus)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Personal-ID</div>
                <div class="info-value">${personalId || "Nicht angegeben"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Erstellt am</div>
                <div class="info-value">${
                  projektDaten?.stammdaten.createdAt
                    ? formatTimestamp(projektDaten.stammdaten.createdAt)
                    : "N/A"
                }</div>
              </div>
            </div>
          </div>

          <!-- PROJEKTADRESSE -->
          <div class="section">
            <div class="section-title">📍 Projektadresse</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Straße</div>
                <div class="info-value">${strasse || "Nicht angegeben"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hausnummer</div>
                <div class="info-value">${hausnummer || "Nicht angegeben"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">PLZ</div>
                <div class="info-value">${plz || "Nicht angegeben"}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Ort</div>
                <div class="info-value">${ort || "Nicht angegeben"}</div>
              </div>
            </div>
          </div>

          <!-- BESCHREIBUNG -->
          <div class="section">
            <div class="section-title">📝 Beschreibung</div>
            <p style="margin-top: 10px; line-height: 1.8;">
              ${projektBeschreibung || "Keine Beschreibung vorhanden"}
            </p>
          </div>

          <!-- GPS-KOORDINATEN -->
          ${
            currentLocation || projektDaten?.stammdaten.latitude
              ? `
          <div class="section">
            <div class="section-title">🗺️ GPS-Koordinaten</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Breitengrad</div>
                <div class="info-value">${(
                  currentLocation?.latitude ||
                  projektDaten?.stammdaten.latitude ||
                  0
                ).toFixed(6)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Längengrad</div>
                <div class="info-value">${(
                  currentLocation?.longitude ||
                  projektDaten?.stammdaten.longitude ||
                  0
                ).toFixed(6)}</div>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <!-- DATEN-ÜBERSICHT -->
          <div class="section">
            <div class="section-title">📊 Datenübersicht</div>
            <div class="summary-box">
              <div class="summary-item">
                <span>📏 Messdaten:</span>
                <span><strong>${messdatenListe.length}</strong> Einträge</span>
              </div>
              <div class="summary-item">
                <span>📸 Fotos:</span>
                <span><strong>${fotosListe.length}</strong> Aufnahmen</span>
              </div>
              <div class="summary-item">
                <span>🛡️ Sicherheitsmaßnahmen:</span>
                <span><strong>${
                  sicherheitListe.length
                }</strong> Maßnahmen</span>
              </div>
              <div class="summary-item">
                <span>💰 Kalkulationen:</span>
                <span><strong>${
                  kalkulationenListe.length
                }</strong> Positionen</span>
              </div>
              ${
                gesamtsumme > 0
                  ? `
              <div class="summary-item">
                <span>💵 Gesamtsumme:</span>
                <span><strong>${gesamtsumme.toFixed(2)} €</strong></span>
              </div>
              `
                  : ""
              }
            </div>
          </div>

          <div class="page-break"></div>

          <!-- MESSDATEN -->
          ${
            messdatenListe.length > 0
              ? `
          <div class="section">
            <div class="section-title">📏 Messdaten (${
              messdatenListe.length
            })</div>
            <div style="margin-top: 15px;">
              ${messdatenListe
                .map(
                  (m, i) => `
                <div class="data-item">
                  <div class="data-item-title">${i + 1}. ${m.type}: ${
                    m.value
                  } ${"unit" in m && m.unit ? m.unit : ""}</div>
                  <div class="data-item-detail">⏱️ ${formatTimestamp(
                    m.timestamp
                  )}</div>
                  ${
                    "notizen" in m && m.notizen
                      ? `<div class="data-item-detail">📝 ${m.notizen}</div>`
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- FOTOS -->
          ${
            fotosListe.length > 0
              ? `
          <div class="section">
            <div class="section-title">📸 Foto-Dokumentation (${
              fotosListe.length
            })</div>
            <div style="margin-top: 15px;">
              ${fotosListe
                .map(
                  (f, i) => `
                <div class="data-item">
                  <div class="data-item-title">${i + 1}. ${
                    f.typ || "Foto"
                  }</div>
                  ${
                    f.beschreibung
                      ? `<div class="data-item-detail">📝 ${f.beschreibung}</div>`
                      : ""
                  }
                  <div class="data-item-detail">⏱️ ${formatTimestamp(
                    f.timestamp
                  )}</div>
                  <div class="data-item-detail" style="color: #999; font-size: 12px;">📁 ${
                    f.uri
                  }</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <!-- SICHERHEITSMASSNAHMEN -->
          ${
            sicherheitListe.length > 0
              ? `
          <div class="section">
            <div class="section-title">🪖 Sicherheitsmaßnahmen (${
              sicherheitListe.length
            })</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Maßnahme</th>
                  <th>Status</th>
                  <th>Verantwortlich</th>
                  <th>Datum</th>
                </tr>
              </thead>
              <tbody>
                ${sicherheitListe
                  .map(
                    (s, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>
                      ${s.massnahme}
                      ${
                        s.notizen
                          ? `<br><small style="color: #666;">${s.notizen}</small>`
                          : ""
                      }
                    </td>
                    <td>
                      <span style="
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        background-color: ${
                          s.status === "durchgeführt"
                            ? "#4CAF50"
                            : s.status === "überprüft"
                            ? "#2196F3"
                            : "#FF9800"
                        };
                        color: white;
                      ">${s.status}</span>
                    </td>
                    <td>${s.verantwortlich || "-"}</td>
                    <td style="font-size: 12px;">${formatTimestamp(
                      s.datum
                    )}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          <!-- KALKULATIONEN -->
          ${
            kalkulationenListe.length > 0
              ? `
          <div class="section">
            <div class="section-title">💰 Kalkulation (${
              kalkulationenListe.length
            } Positionen)</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Position</th>
                  <th>Menge</th>
                  <th>Einheit</th>
                  <th>Einzelpreis</th>
                  <th>Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                ${kalkulationenListe
                  .map(
                    (k, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>
                      ${k.position}
                      ${
                        k.notizen
                          ? `<br><small style="color: #666;">${k.notizen}</small>`
                          : ""
                      }
                    </td>
                    <td style="text-align: right;">${k.menge.toFixed(2)}</td>
                    <td>${k.einheit}</td>
                    <td style="text-align: right;">${k.einzelpreis.toFixed(
                      2
                    )} €</td>
                    <td style="text-align: right; font-weight: 600;">${k.gesamtpreis.toFixed(
                      2
                    )} €</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr style="background-color: #e3f2fd; font-weight: 600;">
                  <td colspan="5" style="text-align: right;">Gesamtsumme:</td>
                  <td style="text-align: right; font-size: 18px;">${gesamtsumme.toFixed(
                    2
                  )} €</td>
                </tr>
              </tbody>
            </table>
          </div>
          `
              : ""
          }

          <!-- FOOTER -->
          <div class="footer">
            <p>Erstellt mit BauLogPro - Professionelles Baustellenmanagement</p>
            <p>© ${new Date().getFullYear()} - Alle Rechte vorbehalten</p>
            <p style="margin-top: 5px;">Dokument generiert am: ${new Date().toLocaleString(
              "de-DE"
            )}</p>
            ${
              projektDaten?.stammdaten.updatedAt
                ? `<p style="margin-top: 3px;">Letzte Aktualisierung: ${formatTimestamp(
                    projektDaten.stammdaten.updatedAt
                  )}</p>`
                : ""
            }
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log("📄 PDF erstellt:", uri);

      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Vollständiger Projektbericht: ${projektName}`,
          UTI: "com.adobe.pdf",
        });

        const fileName = `BauLogPro_${projektName.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_${new Date().toISOString().split("T")[0]}.pdf`;

        Alert.alert(
          "✅ PDF erstellt",
          `Der vollständige Projektbericht wurde erfolgreich als PDF exportiert.\n\n` +
            `Enthält:\n` +
            `• ${messdatenListe.length} Messdaten\n` +
            `• ${fotosListe.length} Fotos\n` +
            `• ${sicherheitListe.length} Sicherheitsmaßnahmen\n` +
            `• ${kalkulationenListe.length} Kalkulationen\n\n` +
            `Dateiname: ${fileName}`,
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
  // PULL-TO-REFRESH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStoredData();
    setRefreshing(false);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const isFormValid =
    projektName.trim().length >= 3 && projektBeschreibung.trim().length >= 10;

  // Prüft, ob sich die Stammdaten geändert haben
  const hasStammdatenChanged =
    projektName !== (projektDetails?.projektName || "") ||
    projektBeschreibung !== (projektDetails?.projektBeschreibung || "");

  // Prüft, ob sich die Unterdaten geändert haben
  const hasProjektDataChanged = (() => {
    if (!completeProjektData || !projektDetails) return false;
    // Messdaten
    const messdatenChanged =
      completeProjektData.messdaten.length !==
        projektDetails.messdaten.length ||
      JSON.stringify(completeProjektData.messdaten) !==
        JSON.stringify(projektDetails.messdaten);
    // Fotos
    const fotosChanged =
      completeProjektData.fotos?.length !==
      (projektDetails.attachments?.length || 0);
    // Sicherheit, Kalkulationen (optional, je nach Datenmodell)
    // Hier können weitere Checks ergänzt werden
    return messdatenChanged || fotosChanged;
  })();

  // Button ist aktiv, wenn Stammdaten oder Unterdaten geändert wurden
  const hasChanges = hasStammdatenChanged || hasProjektDataChanged;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Wrapper>
        <ScrollContainer
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* HEADER scrollt mit */}
          <Header>
            <HeaderTitle>
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <HeaderIcon>📁</HeaderIcon>
                <Text
                  variant="h1"
                  numberOfLines={2}
                  style={{ flexShrink: 1, flexWrap: "wrap" }}
                >
                  Projekt Detail
                </Text>
              </View>
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Zentrale Ansicht mit allen relevanten Informationen
            </CardText>
          </Header>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ZUSAMMENFASSUNG GESPEICHERTER DATEN */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {completeProjektData ? (
            <Card title="📊 Gespeicherte Projektdaten">
              <CardText style={{ marginBottom: 16, fontWeight: "600" }}>
                {completeProjektData.stammdaten.projektName}
              </CardText>

              <InfoBanner type="info">
                <InfoBannerText>
                  ℹ️ Übersicht aller bereits im Projekt gespeicherten Daten
                </InfoBannerText>
              </InfoBanner>

              <SummaryGrid>
                <SummaryItem>
                  <SummaryLabel>📏 Messdaten</SummaryLabel>
                  <SummaryValue>
                    {String(completeProjektData.messdaten.length)}
                  </SummaryValue>
                  {completeProjektData.messdaten.length > 0 ? (
                    <CardText
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      Letzte:{" "}
                      {
                        completeProjektData.messdaten[
                          completeProjektData.messdaten.length - 1
                        ].type
                      }
                    </CardText>
                  ) : null}
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>📸 Fotos</SummaryLabel>
                  <SummaryValue>
                    {String(completeProjektData.fotos.length)}
                  </SummaryValue>
                  {completeProjektData.fotos.length > 0 ? (
                    <CardText
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      {completeProjektData.fotos[0].typ || "Dokumentation"}
                    </CardText>
                  ) : null}
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>🛡️ Sicherheit</SummaryLabel>
                  <SummaryValue>
                    {String(completeProjektData.sicherheit.length)}
                  </SummaryValue>
                  {completeProjektData.sicherheit.length > 0 ? (
                    <CardText
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      {
                        completeProjektData.sicherheit[
                          completeProjektData.sicherheit.length - 1
                        ].status
                      }
                    </CardText>
                  ) : null}
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>💰 Kalkulationen</SummaryLabel>
                  <SummaryValue>
                    {String(completeProjektData.kalkulationen.length)}
                  </SummaryValue>
                  {completeProjektData.kalkulationen.length > 0 ? (
                    <CardText
                      style={{
                        fontSize: 11,
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      {
                        completeProjektData.kalkulationen[
                          completeProjektData.kalkulationen.length - 1
                        ].position
                      }
                    </CardText>
                  ) : null}
                </SummaryItem>
              </SummaryGrid>
            </Card>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* FORMULAR */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Card title="✏️ Projektinformationen">
            <CardText>Geben Sie die Projektdetails ein</CardText>

            <InfoBanner type="info">
              <InfoBannerText>
                💡 Tipp: Wählen Sie im Dashboard ein Projekt aus, um es hier zu
                bearbeiten. Der Projektname wird dann automatisch übernommen.
              </InfoBannerText>
            </InfoBanner>

            {/* Status-Badge */}
            {projektName ? (
              <View
                style={{
                  marginTop: 16,
                  marginBottom: 8,
                  padding: 12,
                  backgroundColor:
                    projektStatus === "active"
                      ? "#e8f5e9"
                      : projektStatus === "completed"
                      ? "#e3f2fd"
                      : "#fff3e0",
                  borderRadius: 8,
                  borderLeftWidth: 4,
                  borderLeftColor:
                    projektStatus === "active"
                      ? "#4CAF50"
                      : projektStatus === "completed"
                      ? "#2196F3"
                      : "#FF9800",
                }}
              >
                <CardText style={{ fontWeight: "600" }}>
                  📊 Status: {getStatusText(projektStatus)}
                </CardText>
              </View>
            ) : null}

            <FormSection>
              <Input
                label="📌 Projektname *"
                placeholder="Geben Sie den Projektnamen ein"
                value={projektName}
                onChangeText={setProjektName}
              />

              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Button
                  variant="secondary"
                  onPress={handleGetCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation
                    ? "🔄 GPS wird ermittelt..."
                    : "📍 GPS-Position verwenden"}
                </Button>
              </View>

              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <CardText style={{ fontWeight: "600", marginBottom: 8 }}>
                  📍 Projektadresse *
                </CardText>
                <Input
                  label="Straße"
                  placeholder="z.B. Hauptstraße"
                  value={strasse}
                  onChangeText={setStrasse}
                />
                <View style={{ marginTop: 8 }}>
                  <Input
                    label="Hausnummer"
                    placeholder="z.B. 123"
                    value={hausnummer}
                    onChangeText={setHausnummer}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Input
                      label="PLZ"
                      placeholder="12345"
                      value={plz}
                      onChangeText={setPlz}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Input
                      label="Ort"
                      placeholder="z.B. Berlin"
                      value={ort}
                      onChangeText={setOrt}
                    />
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Input
                  label="👤 Personal-ID (Ersteller) *"
                  placeholder="z.B. MA-12345 oder Mitarbeiternummer"
                  value={personalId}
                  onChangeText={setPersonalId}
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <Label>📝 Projektbeschreibung *</Label>
                <TextArea
                  placeholder="Geben Sie eine Beschreibung des Projekts ein&#10;(mindestens 10 Zeichen)"
                  value={projektBeschreibung}
                  onChangeText={setProjektBeschreibung}
                  multiline
                  numberOfLines={5}
                  placeholderTextColor="#999"
                />
              </View>

              <CardText style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                * Pflichtfelder
              </CardText>
            </FormSection>
          </Card>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* UNTERVIEWS: Messdaten, Fotos, Sicherheit, Kalkulation */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* Unterviews: Übergabe aus completeProjektData und Callback-Funktionen */}
          {/* Unterviews: Typen und Props korrigiert */}
          <MessdatenErfassung
            messdaten={
              (completeProjektData?.messdaten as import("../utils/projectDataManager").Messdaten[]) ||
              []
            }
            onMessdatenChange={(
              messdaten: import("../utils/projectDataManager").Messdaten[]
            ) =>
              setCompleteProjektData((prev) =>
                prev ? { ...prev, messdaten } : prev
              )
            }
          />
          <FotoDokumentation
            fotos={
              (completeProjektData?.fotos as import("../utils/projectDataManager").FotoDokumentation[]) ||
              []
            }
            onFotoChange={(
              fotos: import("../utils/projectDataManager").FotoDokumentation[]
            ) =>
              setCompleteProjektData((prev) =>
                prev ? { ...prev, fotos } : prev
              )
            }
          />
          <Sicherheitsmassnahmen
            sicherheit={
              (completeProjektData?.sicherheit as import("../utils/projectDataManager").Sicherheitsmassnahme[]) ||
              []
            }
            onSicherheitChange={(
              sicherheit: import("../utils/projectDataManager").Sicherheitsmassnahme[]
            ) =>
              setCompleteProjektData((prev) =>
                prev ? { ...prev, sicherheit } : prev
              )
            }
          />
          <Kalkulation
            kalkulation={
              (completeProjektData?.kalkulationen as import("../utils/projectDataManager").Kalkulation[]) ||
              []
            }
            onKalkulationChange={(
              kalkulationen: import("../utils/projectDataManager").Kalkulation[]
            ) =>
              setCompleteProjektData((prev) =>
                prev ? { ...prev, kalkulationen } : prev
              )
            }
          />

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* EMPTY STATE */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {!completeProjektData && showEmptyState ? (
            <EmptyState>
              <EmptyStateIcon>📭</EmptyStateIcon>
              <EmptyStateText>
                Kein Projekt geladen.{"\n"}
                Erstellen Sie ein neues Projekt oder wählen Sie eines aus dem
                Dashboard.
              </EmptyStateText>
            </EmptyState>
          ) : null}

          {/* Abstand am Ende */}
          <View style={{ height: 100 }} />
        </ScrollContainer>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER ACTIONS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FooterActions>
          <Button
            variant="primary"
            onPress={handleSave}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "⏳ Wird gespeichert..." : "✅ Speichern"}
          </Button>
          <Button variant="secondary" onPress={handleCancel}>
            ❌ Abbrechen
          </Button>
          <Button variant="danger" onPress={handleDeleteProject}>
            🗑️ Projekt löschen
          </Button>
          <Button variant="outline" onPress={generatePDF}>
            📄 PDF Export
          </Button>
        </FooterActions>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOADING OVERLAY */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <LoadingOverlay>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", marginTop: 16 }}>
              Speichert Projektdaten...
            </Text>
          </LoadingOverlay>
        ) : null}
      </Wrapper>
    </SafeAreaView>
  );
}
