// src/views/Sicherheitsmassnahmen.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🪖 SICHERHEITSMASSNAHMEN - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Dokumentation der Sicherheitsmaßnahmen zur Erfüllung von Sicherheitsvorgaben
 *
 * Beschreibung:
 * In diesem View dokumentieren Nutzer die Sicherheitsmaßnahmen, die während
 * der Arbeiten eingesetzt werden, einschließlich der Menge und Art der
 * Absperrungen und verwendeten Warnmittel. Diese Funktion ist entscheidend,
 * um Sicherheitsvorgaben zu erfüllen und eine reibungslose Durchführung der
 * Arbeiten zu garantieren.
 *
 * Features:
 * - Erfassung von Mengen und Arten der Absperrungen
 * - Dokumentation der Warnmittel
 * - Offline-Entwürfe (AsyncStorage)
 * - Liste gespeicherter Sicherheitsmaßnahmen
 * - Validierung der Eingaben
 * - Pull-to-Refresh
 * - N8N Webhook Integration
 *
 * Zielgruppe: Nutzer, die Sicherheitsmaßnahmen dokumentieren müssen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
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

import {
  loadProjectData,
  saveProjectData,
  type CompleteProjektData,
  type Sicherheitsmassnahme as SicherheitsmassnahmeType,
} from "../utils/projectDataManager";
import { getSelectedProject } from "../utils/selectedProject";
const STORAGE_KEYS = {
  draft: "@Sicherheitsmassnahmen:draft",
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

import { Sicherheitsmassnahme } from "../utils/projectDataManager";

interface SicherheitsmassnahmenProps {
  sicherheit: Sicherheitsmassnahme[];
  onSicherheitChange: (sicherheit: Sicherheitsmassnahme[]) => void;
}

interface ApiResponse {
  success: boolean;
  status?: "success" | "error";
  message?: string;
  data?: Sicherheitsmassnahme[];
}

interface SicherheitsmassnahmenProps {
  sicherheit: Sicherheitsmassnahme[];
  onSicherheitChange: (sicherheit: Sicherheitsmassnahme[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUSWAHLOPTIONEN
// ...existing code...

// ═══════════════════════════════════════════════════════════════════════════

const STATUS_OPTIONEN = [
  { label: "Geplant", value: "geplant" },
  { label: "Durchgeführt", value: "durchgeführt" },
  { label: "Überprüft", value: "überprüft" },
];

const MASSNAHMEN_VORLAGEN = [
  { label: "Bauzaun aufstellen", value: "Bauzaun aufstellen" },
  { label: "Absperrung errichten", value: "Absperrung errichten" },
  { label: "Warnschilder anbringen", value: "Warnschilder anbringen" },
  { label: "Warnleuchten installieren", value: "Warnleuchten installieren" },
  {
    label: "Schutzausrüstung bereitstellen",
    value: "Schutzausrüstung bereitstellen",
  },
  {
    label: "Erste-Hilfe-Ausrüstung bereitlegen",
    value: "Erste-Hilfe-Ausrüstung bereitlegen",
  },
  { label: "Notfallplan aushängen", value: "Notfallplan aushängen" },
  {
    label: "Sicherheitseinweisung durchführen",
    value: "Sicherheitseinweisung durchführen",
  },
  { label: "Eigene Maßnahme", value: "" },
];

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

const ListItemTimestamp = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.small}px;
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

const Badge = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.xs}px
    ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
`;

const BadgeText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
`;

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

const Sicherheitsmassnahmen: React.FC<SicherheitsmassnahmenProps> = ({
  sicherheit,
  onSicherheitChange,
}) => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Formular State
  const [massnahme, setMassnahme] = useState<string>("");
  const [status, setStatus] = useState<
    "geplant" | "durchgeführt" | "überprüft"
  >("geplant");
  const [verantwortlich, setVerantwortlich] = useState<string>("");
  const [notizen, setNotizen] = useState<string>("");

  // Daten State
  const [massnahmenListe, setMassnahmenListe] =
    useState<Sicherheitsmassnahme[]>(sicherheit);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-Save Draft
  useEffect(() => {
    const saveDraft = async () => {
      if (massnahme || verantwortlich || notizen) {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.draft,
            JSON.stringify({ massnahme, status, verantwortlich, notizen })
          );
        } catch (error) {
          console.error("❌ Fehler beim Speichern des Entwurfs:", error);
        }
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [massnahme, status, verantwortlich, notizen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DRAFT LADEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEYS.draft);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.massnahme) setMassnahme(parsed.massnahme);
        if (parsed.status) setStatus(parsed.status);
        if (parsed.verantwortlich) setVerantwortlich(parsed.verantwortlich);
        if (parsed.notizen) setNotizen(parsed.notizen);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden des Entwurfs:", error);
    }
  };

  const saveToStorage = async (data: Sicherheitsmassnahme[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(data));
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
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    setError("");

    if (!massnahme.trim()) {
      setError("Bitte geben Sie eine Sicherheitsmaßnahme ein.");
      return false;
    }

    if (massnahme.trim().length < 3) {
      setError("Die Sicherheitsmaßnahme muss mindestens 3 Zeichen lang sein.");
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

    try {
      // 1. Prüfe ob ein Projekt ausgewählt ist
      const selectedProject = await getSelectedProject();
      if (!selectedProject) {
        Alert.alert(
          "⚠️ Kein Projekt ausgewählt",
          "Bitte wählen Sie zuerst ein Projekt im Dashboard aus."
        );
        setIsLoading(false);
        return;
      }

      console.log(
        "📦 [Sicherheit] Speichere in Projekt:",
        selectedProject.name
      );

      // 2. Lade vollständige Projektdaten
      let projektDaten = await loadProjectData(selectedProject.id);

      if (!projektDaten) {
        console.log(
          "⚠️ Projekt existiert noch nicht lokal, erstelle leeres Projekt"
        );

        // Erstelle ein neues leeres Projekt
        const neuesProjekt: CompleteProjektData = {
          stammdaten: {
            id: selectedProject.id,
            projektName: selectedProject.name,
            projektBeschreibung: "",
            status: selectedProject.status,
            strasse: "",
            hausnummer: "",
            plz: "",
            ort: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          messdaten: [],
          fotos: [],
          sicherheit: [],
          kalkulationen: [],
          version: "1.1.1",
        };

        await saveProjectData(neuesProjekt);
        projektDaten = neuesProjekt;
        console.log("✅ Neues Projekt erstellt und gespeichert");
      }

      // 3. Erstelle neue Sicherheitsmaßnahme
      const neueMassnahme: SicherheitsmassnahmeType = {
        id: Date.now().toString(),
        massnahme: massnahme.trim(),
        status: status,
        verantwortlich: verantwortlich.trim() || undefined,
        datum: new Date().toISOString(),
        notizen: notizen.trim() || undefined,
      };

      // 4. Füge Maßnahme zu Projektdaten hinzu
      projektDaten.sicherheit.push(neueMassnahme);
      projektDaten.stammdaten.updatedAt = new Date().toISOString();

      console.log("💾 [Sicherheit] Speichere Maßnahme lokal...");

      // 5. Speichere aktualisierte Projektdaten
      await saveProjectData(projektDaten);

      console.log("✅ [Sicherheit] Maßnahme erfolgreich gespeichert");

      // 6. Aktualisiere lokale Liste
      setMassnahmenListe(projektDaten.sicherheit);
      onSicherheitChange(projektDaten.sicherheit);

      setSuccessMessage("✅ Sicherheitsmaßnahme erfolgreich gespeichert!");

      // 8. Formular zurücksetzen
      setMassnahme("");
      setStatus("geplant");
      setVerantwortlich("");
      setNotizen("");
      await clearDraft();

      Alert.alert("✅ Erfolg", "Sicherheitsmaßnahme erfolgreich gespeichert!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
      setError(errorMessage);
      console.error("❌ [Sicherheit] Speicherfehler:", error);
      Alert.alert("❌ Fehler", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUTTON AKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
            setMassnahme("");
            setStatus("geplant");
            setVerantwortlich("");
            setNotizen("");
            clearDraft();
          },
        },
      ]
    );
  };

  const handleCopyToClipboard = (item: Sicherheitsmassnahme) => {
    const statusText =
      item.status === "geplant"
        ? "Geplant"
        : item.status === "durchgeführt"
        ? "Durchgeführt"
        : "Überprüft";

    const text = `Maßnahme: ${
      item.massnahme
    }\nStatus: ${statusText}\nVerantwortlich: ${
      item.verantwortlich || "Nicht angegeben"
    }\nDatum: ${new Date(item.datum).toLocaleDateString("de-DE")}\nNotizen: ${
      item.notizen || "Keine"
    }`;
    Clipboard.setString(text);
    Alert.alert(
      "✅ Kopiert",
      "Sicherheitsmaßnahme wurde in die Zwischenablage kopiert."
    );
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "🗑️ Löschen",
      "Möchten Sie diese Sicherheitsmaßnahme wirklich löschen?",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Lade aktuelles Projekt
              const selectedProject = await getSelectedProject();
              if (!selectedProject) return;

              const projektDaten = await loadProjectData(selectedProject.id);
              if (!projektDaten) return;

              // 2. Entferne Maßnahme
              projektDaten.sicherheit = projektDaten.sicherheit.filter(
                (item) => item.id !== id
              );
              projektDaten.stammdaten.updatedAt = new Date().toISOString();

              // 3. Speichere aktualisiertes Projekt
              await saveProjectData(projektDaten);

              // 4. Aktualisiere lokale Liste
              setMassnahmenListe(projektDaten.sicherheit);
              onSicherheitChange(projektDaten.sicherheit);

              Alert.alert(
                "✅ Gelöscht",
                "Sicherheitsmaßnahme wurde erfolgreich gelöscht."
              );
            } catch (error) {
              console.error("❌ Fehler beim Löschen:", error);
              Alert.alert(
                "❌ Fehler",
                "Maßnahme konnte nicht gelöscht werden."
              );
            }
          },
        },
      ]
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PULL-TO-REFRESH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const isFormValid = massnahme.trim().length >= 3;

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

  const getStatusLabel = (
    status: "geplant" | "durchgeführt" | "überprüft"
  ): string => {
    return status === "geplant"
      ? "Geplant"
      : status === "durchgeführt"
      ? "Durchgeführt"
      : "Überprüft";
  };

  const getStatusColor = (
    status: "geplant" | "durchgeführt" | "überprüft"
  ): string => {
    return status === "geplant"
      ? "#FFA500"
      : status === "durchgeführt"
      ? "#4CAF50"
      : "#2196F3";
  };

  // Statistiken berechnen
  const geplantCount = massnahmenListe.filter(
    (m) => m.status === "geplant"
  ).length;
  const durchgefuehrtCount = massnahmenListe.filter(
    (m) => m.status === "durchgeführt"
  ).length;
  const ueberprueftCount = massnahmenListe.filter(
    (m) => m.status === "überprüft"
  ).length;

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
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* HEADER (scrollt mit) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Header>
            <HeaderTitle>
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <HeaderIcon>🪖</HeaderIcon>
                <Text
                  variant="h1"
                  numberOfLines={2}
                  style={{ flexShrink: 1, flexWrap: "wrap" }}
                >
                  Sicherheit
                </Text>
              </View>
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Dokumentation von Absperrungen und Warnmitteln
            </CardText>
          </Header>

          {/* Success Banner */}
          {successMessage ? (
            <InfoBanner type="success">
              <InfoBannerText>{successMessage}</InfoBannerText>
            </InfoBanner>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <InfoBanner type="error">
              <InfoBannerText>⚠️ {error}</InfoBannerText>
            </InfoBanner>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STATISTIK (nur wenn Daten vorhanden) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {massnahmenListe.length > 0 ? (
            <Card title="📊 Übersicht">
              <CardText>
                Zusammenfassung aller erfassten Sicherheitsmaßnahmen
              </CardText>

              <SummaryGrid>
                <SummaryItem>
                  <SummaryLabel>Gesamt</SummaryLabel>
                  <SummaryValue>{massnahmenListe.length}</SummaryValue>
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>Geplant</SummaryLabel>
                  <SummaryValue>{geplantCount}</SummaryValue>
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>Durchgeführt</SummaryLabel>
                  <SummaryValue>{durchgefuehrtCount}</SummaryValue>
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>Überprüft</SummaryLabel>
                  <SummaryValue>{ueberprueftCount}</SummaryValue>
                </SummaryItem>
              </SummaryGrid>
            </Card>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* EINGABE FORMULAR */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Card title="📝 Neue Sicherheitsmaßnahme erfassen">
            <CardText>
              Erfassen Sie Sicherheitsmaßnahmen für das Projekt
            </CardText>

            <FormSection>
              <Select
                label="🛡️ Maßnahmenvorlage"
                placeholder="Vorlage wählen oder eigene eingeben..."
                options={MASSNAHMEN_VORLAGEN}
                selectedValue=""
                onSelect={(value) => {
                  if (value) setMassnahme(value);
                }}
              />

              <Input
                label="🪖 Sicherheitsmaßnahme *"
                placeholder="z.B. Bauzaun aufstellen"
                value={massnahme}
                onChangeText={setMassnahme}
                multiline
                numberOfLines={2}
              />

              <Select
                label="📊 Status *"
                placeholder="Status wählen..."
                options={STATUS_OPTIONEN}
                selectedValue={status}
                onSelect={setStatus as (value: string) => void}
              />

              <Input
                label="👤 Verantwortliche Person (optional)"
                placeholder="z.B. Max Mustermann"
                value={verantwortlich}
                onChangeText={setVerantwortlich}
              />

              <Input
                label="📝 Notizen (optional)"
                placeholder="Zusätzliche Informationen..."
                value={notizen}
                onChangeText={setNotizen}
                multiline
                numberOfLines={3}
              />

              <CardText style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                * Pflichtfelder
              </CardText>
            </FormSection>
          </Card>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* GESPEICHERTE SICHERHEITSMASSNAHMEN */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {massnahmenListe.length > 0 ? (
            <Card title="📋 Erfasste Sicherheitsmaßnahmen">
              <CardText>
                {massnahmenListe.length}{" "}
                {massnahmenListe.length === 1 ? "Maßnahme" : "Maßnahmen"}{" "}
                gespeichert
              </CardText>

              {massnahmenListe.map((item) => (
                <ListItem key={item.id}>
                  <ListItemHeader>
                    <ListItemTitle style={{ flex: 1 }}>
                      {item.massnahme}
                    </ListItemTitle>
                    <Badge
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      <BadgeText>{getStatusLabel(item.status)}</BadgeText>
                    </Badge>
                  </ListItemHeader>

                  <ListItemTimestamp>
                    📅 {formatTimestamp(item.datum)}
                  </ListItemTimestamp>

                  {item.verantwortlich ? (
                    <CardText style={{ marginTop: 8 }}>
                      👤 Verantwortlich: {item.verantwortlich}
                    </CardText>
                  ) : null}

                  {item.notizen ? (
                    <CardText style={{ marginTop: 4, fontStyle: "italic" }}>
                      📝 {item.notizen}
                    </CardText>
                  ) : null}

                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="secondary"
                        onPress={() => handleCopyToClipboard(item)}
                      >
                        📋 Kopieren
                      </Button>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="danger"
                        onPress={() => handleDelete(item.id)}
                      >
                        🗑️ Löschen
                      </Button>
                    </View>
                  </View>
                </ListItem>
              ))}
            </Card>
          ) : (
            /* ═══════════════════════════════════════════════════════════ */
            /* EMPTY STATE */
            /* ═══════════════════════════════════════════════════════════ */
            <EmptyState>
              <EmptyStateIcon>🪖</EmptyStateIcon>
              <EmptyStateText>
                Noch keine Sicherheitsmaßnahmen erfasst.{"\n"}
                Füllen Sie das Formular aus und speichern Sie.
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
            onPress={handleSave}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "⏳ Wird gespeichert..." : "✅ Speichern"}
          </Button>
          <Button variant="secondary" onPress={handleCancel}>
            ❌ Abbrechen
          </Button>
        </FooterActions>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOADING OVERLAY */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <LoadingOverlay>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", marginTop: 16 }}>
              Speichert Sicherheitsmaßnahme...
            </Text>
          </LoadingOverlay>
        ) : null}
      </Wrapper>
    </SafeAreaView>
  );
};

export default Sicherheitsmassnahmen;
