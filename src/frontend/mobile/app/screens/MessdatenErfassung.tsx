// Platzhalter für Server-Sync
const MESSDATEN_CREATE_URL = "https://example.com/api/messdaten";
const HOOK_SECRET = "DEIN_HOOK_SECRET";
// src/views/MessdatenErfassung.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📏 MESSDATEN ERFASSUNG - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Präzise Erfassung von relevanten Messdaten vor Ort
 *
 * Beschreibung:
 * Ermöglicht Nutzern die direkte Eingabe von Messdaten wie Länge, Breite,
 * Verlegetiefe und Oberflächenart. Fokus auf Genauigkeit und intuitive
 * Benutzerführung für qualitativ hochwertige Dokumentation.
 *
 * Features:
 * - Eingabe von Länge, Breite und Verlegetiefe
 * - Auswahl der Oberflächenart
 * - Formularvalidierung (nur Zahlen)
 * - Offline-Entwürfe (AsyncStorage)
 * - Clipboard-Unterstützung
 * - Liste gespeicherter Messdaten
 *
 * Zielgruppe: Fachkräfte und Techniker im Außendienst
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
import { Button, Card, CardText, Input, Text } from "../components";
import type { AppTheme } from "../themes";
import {
  loadProjectData,
  saveProjectData,
  type CompleteProjektData,
  type Messdaten,
} from "../utils/projectDataManager";
import { getSelectedProject } from "../utils/selectedProject";

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface MessdatenErfassungProps {
  messdaten: Messdaten[];
  onMessdatenChange: (messdaten: Messdaten[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// OBERFLÄCHENARTEN
// ═══════════════════════════════════════════════════════════════════════════

const SURFACE_TYPES = [
  { label: "Holz", value: "holz" },
  { label: "Beton", value: "beton" },
  { label: "Asphalt", value: "asphalt" },
  { label: "Kies", value: "kies" },
  { label: "Pflaster", value: "pflaster" },
  { label: "Erde", value: "erde" },
  { label: "Sonstiges", value: "sonstiges" },
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

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

const MessdatenErfassung: React.FC<MessdatenErfassungProps> = ({
  messdaten,
  onMessdatenChange,
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
  const [messwertTyp, setMesswertTyp] = useState<string>("");
  const [wert, setWert] = useState<string>("");
  const [einheit, setEinheit] = useState<string>("m"); // Standardeinheit Meter
  const [notizen, setNotizen] = useState<string>("");

  // Daten State
  const [localMessdaten, setLocalMessdaten] = useState<Messdaten[]>(messdaten);

  const STORAGE_KEYS = {
    draft: "@Messdaten:draft",
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.draft);
    } catch (error) {
      console.error("❌ Fehler beim Löschen des Entwurfs:", error);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    setLocalMessdaten(messdaten);
  }, [messdaten]);

  // Auto-Save Draft
  useEffect(() => {
    const saveDraft = async () => {
      if (messwertTyp || wert || einheit || notizen) {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.draft,
            JSON.stringify({ messwertTyp, wert, einheit, notizen })
          );
        } catch (error) {
          console.error("❌ Fehler beim Speichern des Entwurfs:", error);
        }
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [messwertTyp, wert, einheit, notizen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    setError("");

    if (!messwertTyp.trim()) {
      setError("Bitte geben Sie einen Typ für die Messung ein (z.B. 'Länge').");
      return false;
    }

    if (!wert.trim()) {
      setError("Bitte geben Sie einen Messwert ein.");
      return false;
    }

    if (isNaN(Number(wert.replace(",", ".")))) {
      setError("Bitte geben Sie eine gültige Zahl als Messwert ein.");
      return false;
    }

    if (!einheit.trim()) {
      setError("Bitte geben Sie eine Einheit für den Messwert ein (z.B. 'm').");
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

      console.log("📊 Lade Projektdaten für:", selectedProject.name);

      // 2. Lade vollständige Projektdaten
      let projektDaten = await loadProjectData(selectedProject.id);

      if (!projektDaten) {
        console.log(
          "⚠️ Projekt existiert noch nicht lokal, erstelle leeres Projekt"
        );

        // Erstelle ein neues leeres Projekt mit den Basis-Informationen
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
          version: "1.0.0",
        };

        // Speichere das neue Projekt
        await saveProjectData(neuesProjekt);
        projektDaten = neuesProjekt;
        console.log("✅ Neues Projekt erstellt und gespeichert");
      }

      // 3. Erstelle neues Messdaten-Objekt
      const neueMessung: Messdaten = {
        id: Date.now().toString(),
        type: messwertTyp,
        value: wert.replace(",", "."),
        unit: einheit,
        timestamp: new Date().toISOString(),
        notizen: notizen,
      };

      // 4. Füge Messung zu Projektdaten hinzu
      projektDaten.messdaten.push(neueMessung);
      projektDaten.stammdaten.updatedAt = new Date().toISOString();

      console.log("💾 Speichere Messdaten lokal...");

      // 5. Speichere aktualisierte Projektdaten
      await saveProjectData(projektDaten);

      console.log("✅ Messdaten erfolgreich gespeichert");

      // 6. Optional: Server-Sync (wenn konfiguriert)
      try {
        const response = await fetch(MESSDATEN_CREATE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-hook-secret": HOOK_SECRET,
            Accept: "application/json",
          },
          body: JSON.stringify(neueMessung),
        });

        if (response.ok) {
          console.log("✅ Server-Sync erfolgreich");
        }
      } catch (serverError) {
        console.warn(
          "⚠️ Server-Sync fehlgeschlagen, Messdaten nur lokal gespeichert:",
          serverError
        );
      }

      const updatedList = [neueMessung, ...localMessdaten];
      setLocalMessdaten(updatedList);
      onMessdatenChange(updatedList);
      await clearDraft();

      setSuccessMessage("✅ Messdaten erfolgreich gespeichert!");

      // 8. Formular zurücksetzen
      setMesswertTyp("");
      setWert("");
      setEinheit("m");
      setNotizen("");

      Alert.alert(
        "✅ Erfolg",
        `Messdaten wurden im Projekt "${selectedProject.name}" gespeichert!`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
      setError(errorMessage);
      console.error("❌ Speicherfehler:", error);
      Alert.alert("❌ Fehler", errorMessage);
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
            setMesswertTyp("");
            setWert("");
            setEinheit("m");
            setNotizen("");
            clearDraft();
          },
        },
      ]
    );
  };

  const handleCopyToClipboard = (entry: Messdaten) => {
    const text =
      `Typ: ${entry.type}\n` +
      `Wert: ${entry.value} ${entry.unit || ""}\n` +
      `Notizen: ${entry.notizen || "-"}\n` +
      `Datum: ${formatTimestamp(entry.timestamp)}`;
    Clipboard.setString(text);
    Alert.alert(
      "✅ Kopiert",
      "Messdaten wurden in die Zwischenablage kopiert."
    );
  };

  const handleDelete = async (id: string) => {
    Alert.alert("🗑️ Löschen", "Möchten Sie diese Messdaten wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          const updatedList = localMessdaten.filter((item) => item.id !== id);
          setLocalMessdaten(updatedList);
          Alert.alert("✅ Gelöscht", "Messdaten wurden erfolgreich gelöscht.");
        },
      },
    ]);
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
    messwertTyp.trim().length > 0 &&
    wert.trim().length > 0 &&
    einheit.trim().length > 0;

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
                <HeaderIcon>📏</HeaderIcon>
                <Text
                  variant="h1"
                  numberOfLines={2}
                  style={{ flexShrink: 1, flexWrap: "wrap" }}
                >
                  Messdaten Erfassung
                </Text>
              </View>
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Präzise Erfassung von Messdaten vor Ort
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
          {/* EINGABE FORMULAR */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Card title="📝 Messwerte eingeben">
            <CardText>
              Erfassen Sie hier neue Messdaten für das ausgewählte Projekt.
            </CardText>

            <FormSection>
              <Input
                label="🏷️ Typ der Messung"
                placeholder="z.B. Länge, Temperatur, Feuchtigkeit"
                value={messwertTyp}
                onChangeText={setMesswertTyp}
              />

              <Input
                label="🔢 Wert"
                placeholder="z.B. 12,5"
                value={wert}
                onChangeText={setWert}
                keyboardType="numeric"
              />

              <Input
                label="📏 Einheit"
                placeholder="z.B. m, °C, %"
                value={einheit}
                onChangeText={setEinheit}
              />

              <View style={{ marginTop: 16, paddingBottom: 8 }}>
                <Input
                  label="📝 Notizen (optional)"
                  placeholder="Zusätzliche Bemerkungen zur Messung"
                  value={notizen}
                  onChangeText={setNotizen}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </FormSection>
          </Card>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* GESPEICHERTE MESSDATEN */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {localMessdaten.length > 0 ? (
            <Card title="📋 Gespeicherte Messdaten">
              <CardText>
                {localMessdaten.length}{" "}
                {localMessdaten.length === 1 ? "Eintrag" : "Einträge"}{" "}
                gespeichert
              </CardText>

              {localMessdaten.map((entry) => (
                <ListItem key={entry.id}>
                  <ListItemHeader>
                    <ListItemTitle>
                      {entry.type}: {entry.value} {entry.unit}
                    </ListItemTitle>
                    <ListItemTimestamp>
                      {formatTimestamp(entry.timestamp)}
                    </ListItemTimestamp>
                  </ListItemHeader>

                  {entry.notizen && (
                    <CardText style={{ marginTop: 8, fontStyle: "italic" }}>
                      {entry.notizen}
                    </CardText>
                  )}

                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="secondary"
                        onPress={() => handleCopyToClipboard(entry)}
                      >
                        📋 Kopieren
                      </Button>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        variant="danger"
                        onPress={() => handleDelete(entry.id)}
                      >
                        🗑️ Löschen
                      </Button>
                    </View>
                  </View>
                </ListItem>
              ))}
            </Card>
          ) : (
            <EmptyState>
              <EmptyStateIcon>📭</EmptyStateIcon>
              <EmptyStateText>
                Noch keine Messdaten erfasst.{"\n"}
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
            {isLoading ? "⏳ Wird gespeichert..." : "✅ Messung speichern"}
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
              Speichert Messdaten...
            </Text>
          </LoadingOverlay>
        ) : null}
      </Wrapper>
    </SafeAreaView>
  );
};

export default MessdatenErfassung;
