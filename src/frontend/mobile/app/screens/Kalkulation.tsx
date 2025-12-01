// src/views/Kalkulation.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧮 KALKULATION - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Erstellung von Kostenvoranschlägen und Berichterstellung
 *
 * Beschreibung:
 * Der Kalkulation-View ermöglicht Nutzern, Kostenvoranschläge zu erstellen
 * und umfassende Berichte zu generieren. Hierbei werden Stückpreise für
 * Materialien, Arbeitszeiten und Sicherheitsausrüstungen automatisch
 * berechnet, was die Effizienz steigert. Berichte können in PDF- oder
 * CSV-Formaten exportiert werden.
 *
 * Features:
 * - Kostenvoranschläge erstellen
 * - Automatische Berechnung von Gesamtkosten
 * - Berichte generieren (PDF/CSV)
 * - Offline-Entwürfe (AsyncStorage)
 * - Liste gespeicherter Kalkulationen
 * - Clipboard-Unterstützung
 * - Pull-to-Refresh
 * - Expandable Sections
 *
 * Zielgruppe: Nutzer, die Kostenvoranschläge erstellen und verwalten müssen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
import { Button, Card, CardText, Input, Text } from "../components";
import type { AppTheme } from "../themes";
import {
  loadProjectData,
  saveProjectData,
  type CompleteProjektData,
  type Kalkulation as KalkulationType,
} from "../utils/projectDataManager";
import { getSelectedProject } from "../utils/selectedProject";

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface Kalkulation {
  id: string;
  position: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
  notizen?: string;
  timestamp: string;
}

interface ApiResponse {
  status: "success" | "error";
  message?: string;
  data?: {
    totalCost?: number;
    kalkulationen?: Kalkulation[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════

const KALKULATION_CREATE_URL =
  "https://n8n.cloudforming.de/webhook/kalkulation-create";
const KALKULATION_UPDATE_URL =
  "https://n8n.cloudforming.de/webhook/kalkulation-update";
const KALKULATION_LIST_URL =
  "https://n8n.cloudforming.de/webhook/kalkulation-list";
const KALKULATION_DELETE_URL =
  "https://n8n.cloudforming.de/webhook/kalkulation-delete";
const HOOK_SECRET = "MY_SUPER_SECRET";

// ═══════════════════════════════════════════════════════════════════════════
// ASYNCSTORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  draft: "@Kalkulation:draft",
  data: "@Kalkulation:data",
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

const CalculationResult = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.lg}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md}px;
`;

const CalculationLabel = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const CalculationValue = styled.Text`
  color: #ffffff;
  font-size: 32px;
  font-weight: 700;
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

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

interface KalkulationProps {
  kalkulation: Kalkulation[];
  onKalkulationChange: (kalkulation: Kalkulation[]) => void;
}

const Kalkulation: React.FC<KalkulationProps> = ({
  kalkulation,
  onKalkulationChange,
}) => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Formular State
  const [position, setPosition] = useState<string>("");
  const [menge, setMenge] = useState<string>("");
  const [einheit, setEinheit] = useState<string>("Stk");
  const [einzelpreis, setEinzelpreis] = useState<string>("");
  const [notizen, setNotizen] = useState<string>("");

  // Daten State
  const [localKalkulation, setLocalKalkulation] =
    useState<Kalkulation[]>(kalkulation);
  const [currentCalculation, setCurrentCalculation] = useState<number | null>(
    null
  );

  useEffect(() => {
    setLocalKalkulation(kalkulation);
  }, [kalkulation]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Auto-Calculate
  useEffect(() => {
    if (menge && einzelpreis) {
      const m = Number(menge);
      const preis = Number(einzelpreis);
      if (!isNaN(m) && !isNaN(preis) && m > 0 && preis > 0) {
        setCurrentCalculation(m * preis);
      } else {
        setCurrentCalculation(null);
      }
    } else {
      setCurrentCalculation(null);
    }
  }, [menge, einzelpreis]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    setError("");

    if (!position.trim()) {
      setError("Bitte geben Sie eine Position/Bezeichnung ein.");
      return false;
    }

    if (!menge.trim()) {
      setError("Bitte geben Sie eine Menge ein.");
      return false;
    }

    const m = Number(menge);
    if (isNaN(m) || m <= 0) {
      setError("Bitte eine gültige Menge eingeben (nur positive Zahlen).");
      return false;
    }

    if (!einzelpreis.trim()) {
      setError("Bitte geben Sie einen Einzelpreis ein.");
      return false;
    }

    const preis = Number(einzelpreis);
    if (isNaN(preis) || preis <= 0) {
      setError(
        "Bitte einen gültigen Einzelpreis eingeben (nur positive Zahlen)."
      );
      return false;
    }

    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUTTON AKTIONEN
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
        "� [Kalkulation] Speichere in Projekt:",
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

      // 3. Berechne Gesamtpreis
      const gesamtpreis = Number(menge) * Number(einzelpreis);

      // 4. Erstelle neue Kalkulation
      const neueKalkulation: KalkulationType = {
        id: Date.now().toString(),
        position: position.trim(),
        menge: Number(menge),
        einheit: einheit,
        einzelpreis: Number(einzelpreis),
        gesamtpreis: gesamtpreis,
        notizen: notizen.trim() || undefined,
        timestamp: new Date().toISOString(),
      };

      // 5. Füge Kalkulation zu Projektdaten hinzu
      projektDaten.kalkulationen.push(neueKalkulation);
      projektDaten.stammdaten.updatedAt = new Date().toISOString();

      console.log("💾 [Kalkulation] Speichere lokal...");

      // 6. Speichere aktualisierte Projektdaten
      await saveProjectData(projektDaten);

      console.log("✅ [Kalkulation] Erfolgreich gespeichert");

      // 7. Aktualisiere lokale Liste
      setLocalKalkulation(projektDaten.kalkulationen);
      onKalkulationChange(projektDaten.kalkulationen);

      setSuccessMessage("✅ Kalkulation erfolgreich gespeichert!");

      // 9. Formular zurücksetzen
      setPosition("");
      setMenge("");
      setEinheit("Stk");
      setEinzelpreis("");
      setNotizen("");
      setCurrentCalculation(null);
      Alert.alert("✅ Erfolg", "Kalkulation erfolgreich gespeichert!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
      setError(errorMessage);
      console.error("❌ [Kalkulation] Speicherfehler:", error);
      Alert.alert("❌ Fehler", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = () => {
    if (localKalkulation.length === 0) {
      Alert.alert(
        "⚠️ Keine Daten",
        "Es sind keine Kalkulationen vorhanden, um einen Bericht zu erstellen."
      );
      return;
    }

    const totalCosts = localKalkulation.reduce(
      (sum, k) => sum + k.gesamtpreis,
      0
    );
    const avgCost = totalCosts / localKalkulation.length;

    const report =
      `📊 KALKULATIONS-BERICHT\n\n` +
      `Anzahl Kalkulationen: ${localKalkulation.length}\n` +
      `Gesamtkosten: ${totalCosts.toFixed(2)} €\n` +
      `Durchschnittskosten: ${avgCost.toFixed(2)} €\n\n` +
      `Erstellt am: ${new Date().toLocaleString("de-DE")}`;

    Alert.alert("📄 Bericht erstellt", report, [
      {
        text: "📋 In Zwischenablage kopieren",
        onPress: () => {
          Clipboard.setString(report);
          Alert.alert(
            "✅ Kopiert",
            "Bericht wurde in die Zwischenablage kopiert."
          );
        },
      },
      { text: "OK" },
    ]);
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
            setPosition("");
            setMenge("");
            setEinheit("Stk");
            setEinzelpreis("");
            setNotizen("");
            setCurrentCalculation(null);
          },
        },
      ]
    );
  };

  const handleCopyToClipboard = (item: Kalkulation) => {
    const text = `${item.position}\nMenge: ${item.menge} ${
      item.einheit
    }\nEinzelpreis: ${item.einzelpreis.toFixed(
      2
    )}€\nGesamtpreis: ${item.gesamtpreis.toFixed(2)}€${
      item.notizen ? `\nNotizen: ${item.notizen}` : ""
    }`;
    Clipboard.setString(text);
    Alert.alert(
      "✅ Kopiert",
      "Kalkulation wurde in die Zwischenablage kopiert."
    );
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "🗑️ Löschen",
      "Möchten Sie diese Kalkulation wirklich löschen?",
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

              // 2. Entferne Kalkulation
              projektDaten.kalkulationen = projektDaten.kalkulationen.filter(
                (item) => item.id !== id
              );
              projektDaten.stammdaten.updatedAt = new Date().toISOString();

              // 3. Speichere aktualisiertes Projekt
              await saveProjectData(projektDaten);

              // 4. Aktualisiere lokale Liste
              setLocalKalkulation(projektDaten.kalkulationen);
              onKalkulationChange(projektDaten.kalkulationen);

              Alert.alert(
                "✅ Gelöscht",
                "Kalkulation wurde erfolgreich gelöscht."
              );
            } catch (error) {
              console.error("❌ Fehler beim Löschen:", error);
              Alert.alert(
                "❌ Fehler",
                "Kalkulation konnte nicht gelöscht werden."
              );
            }
          },
        },
      ]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

  const isFormValid =
    position.trim().length > 0 &&
    menge.trim().length > 0 &&
    einzelpreis.trim().length > 0;

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

  // Statistiken
  const totalCosts = localKalkulation.reduce(
    (sum, k) => sum + k.gesamtpreis,
    0
  );
  const avgCost =
    localKalkulation.length > 0 ? totalCosts / localKalkulation.length : 0;

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
          {/* HEADER (scrollt mit) */}
          <Header>
            <HeaderTitle>
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <HeaderIcon>🧮</HeaderIcon>
                <Text
                  variant="h1"
                  numberOfLines={2}
                  style={{ flexShrink: 1, flexWrap: "wrap" }}
                >
                  Kalkulation
                </Text>
              </View>
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Kostenvoranschläge erstellen und Berichte generieren
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
          {localKalkulation.length > 0 ? (
            <Card title="📊 Übersicht">
              <CardText>Zusammenfassung aller Kalkulationen</CardText>

              <SummaryGrid>
                <SummaryItem>
                  <SummaryLabel>Kalkulationen</SummaryLabel>
                  <SummaryValue>{localKalkulation.length}</SummaryValue>
                </SummaryItem>

                <SummaryItem>
                  <SummaryLabel>Gesamtkosten</SummaryLabel>
                  <SummaryValue>{totalCosts.toFixed(2)}€</SummaryValue>
                </SummaryItem>

                <SummaryItem style={{ width: "100%" }}>
                  <SummaryLabel>Durchschnittskosten</SummaryLabel>
                  <SummaryValue>{avgCost.toFixed(2)}€</SummaryValue>
                </SummaryItem>
              </SummaryGrid>
            </Card>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* EINGABE FORMULAR */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Card title="✏️ Neue Kalkulation erstellen">
            <CardText>Geben Sie die Berechnungsgrundlagen ein</CardText>

            <FormSection>
              <Input
                label="📝 Position *"
                placeholder="z.B. Erdarbeiten, Mauerwerk, Verputzen"
                value={position}
                onChangeText={setPosition}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="📦 Menge *"
                    placeholder="z.B. 100"
                    value={menge}
                    onChangeText={setMenge}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="📐 Einheit *"
                    placeholder="z.B. m², Stk, m"
                    value={einheit}
                    onChangeText={setEinheit}
                  />
                </View>
              </View>

              <Input
                label="💰 Einzelpreis (€) *"
                placeholder="z.B. 15.50"
                value={einzelpreis}
                onChangeText={setEinzelpreis}
                keyboardType="numeric"
              />

              <Input
                label="📝 Notizen (optional)"
                placeholder="Zusätzliche Hinweise oder Details"
                value={notizen}
                onChangeText={setNotizen}
                multiline={true}
                numberOfLines={3}
              />

              <CardText style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                * Pflichtfelder
              </CardText>
            </FormSection>

            {/* Live-Berechnung */}
            {currentCalculation !== null ? (
              <CalculationResult>
                <CalculationLabel>💵 BERECHNETER GESAMTPREIS</CalculationLabel>
                <CalculationValue>
                  {currentCalculation.toFixed(2)} €
                </CalculationValue>
                <CardText
                  style={{ color: "#ffffff", marginTop: 8, fontSize: 12 }}
                >
                  {menge} {einheit} × {einzelpreis}€ ={" "}
                  {currentCalculation.toFixed(2)}€
                </CardText>
              </CalculationResult>
            ) : null}
          </Card>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* GESPEICHERTE KALKULATIONEN */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {localKalkulation.length > 0 ? (
            <Card title="📋 Gespeicherte Kalkulationen">
              <CardText>
                {localKalkulation.length}{" "}
                {localKalkulation.length === 1 ? "Eintrag" : "Einträge"}{" "}
                gespeichert
              </CardText>

              {localKalkulation.map((kalkulation) => (
                <ListItem key={kalkulation.id}>
                  <ListItemHeader>
                    <ListItemTitle>{kalkulation.position}</ListItemTitle>
                    <Text
                      style={{
                        fontWeight: "bold",
                        fontSize: 18,
                        color: "#4CAF50",
                      }}
                    >
                      {kalkulation.gesamtpreis.toFixed(2)}€
                    </Text>
                  </ListItemHeader>

                  <ListItemTimestamp>
                    {formatTimestamp(kalkulation.timestamp)}
                  </ListItemTimestamp>

                  <CardText style={{ marginTop: 8 }}>
                    📦 {kalkulation.menge} {kalkulation.einheit} × 💰{" "}
                    {kalkulation.einzelpreis}€
                  </CardText>

                  <ExpandButton onPress={() => toggleExpand(kalkulation.id)}>
                    <ExpandButtonText>
                      {expandedItems.has(kalkulation.id)
                        ? "▼ Details ausblenden"
                        : "▶ Details anzeigen"}
                    </ExpandButtonText>
                  </ExpandButton>

                  {expandedItems.has(kalkulation.id) ? (
                    <ExpandableSection>
                      <SummaryGrid>
                        <SummaryItem>
                          <SummaryLabel>Menge</SummaryLabel>
                          <SummaryValue>
                            {kalkulation.menge} {kalkulation.einheit}
                          </SummaryValue>
                        </SummaryItem>

                        <SummaryItem>
                          <SummaryLabel>Einzelpreis</SummaryLabel>
                          <SummaryValue>
                            {kalkulation.einzelpreis}€
                          </SummaryValue>
                        </SummaryItem>

                        <SummaryItem style={{ width: "100%" }}>
                          <SummaryLabel>Gesamtpreis</SummaryLabel>
                          <SummaryValue>
                            {kalkulation.gesamtpreis.toFixed(2)}€
                          </SummaryValue>
                        </SummaryItem>

                        {kalkulation.notizen ? (
                          <SummaryItem style={{ width: "100%" }}>
                            <SummaryLabel>Notizen</SummaryLabel>
                            <CardText style={{ marginTop: 4 }}>
                              {kalkulation.notizen}
                            </CardText>
                          </SummaryItem>
                        ) : null}
                      </SummaryGrid>

                      <View
                        style={{ flexDirection: "row", marginTop: 12, gap: 8 }}
                      >
                        <View style={{ flex: 1 }}>
                          <Button
                            variant="secondary"
                            onPress={() => handleCopyToClipboard(kalkulation)}
                          >
                            📋 Kopieren
                          </Button>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            variant="danger"
                            onPress={() => handleDelete(kalkulation.id)}
                          >
                            🗑️ Löschen
                          </Button>
                        </View>
                      </View>
                    </ExpandableSection>
                  ) : null}
                </ListItem>
              ))}
            </Card>
          ) : (
            /* ═══════════════════════════════════════════════════════════ */
            /* EMPTY STATE */
            /* ═══════════════════════════════════════════════════════════ */
            <EmptyState>
              <EmptyStateIcon>📊</EmptyStateIcon>
              <EmptyStateText>
                Noch keine Kalkulationen erstellt.{"\n"}
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
          <Button
            variant="secondary"
            onPress={handleGenerateReport}
            disabled={localKalkulation.length === 0}
          >
            📄 Bericht erstellen
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
              Speichert Kalkulation...
            </Text>
          </LoadingOverlay>
        ) : null}
      </Wrapper>
    </SafeAreaView>
  );
};

export default Kalkulation;
