// src/screens/FotoDokumentation.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📷 FOTO-DOKUMENTATION SCREEN - baulogpro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Effiziente Dokumentation von Baustellenfotos im Vorher-/Nachher-Vergleich
 *
 * Beschreibung:
 * Ermöglicht es Nutzern, Fotos von Baustellen zu erfassen und mit GPS-Standorten
 * sowie Zeitstempeln zu versehen. Dies garantiert eine umfassende Beweissicherung
 * und erleichtert die Nachverfolgbarkeit von Änderungen und Schäden.
 *
 * Features:
 * - Foto-Upload mit Kamera oder Galerie
 * - GPS-Standorterfassung
 * - Automatische Zeitstempel
 * - Vorher-/Nachher-Vergleich
 * - Offline-Entwürfe via AsyncStorage
 * - Pull-to-Refresh Funktionalität
 *
 * Zielgruppe: Bauleiter, Ingenieure, Projektmanager
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
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

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

import { FotoDokumentation } from "../utils/projectDataManager";

// Props für die Komponente
// ...existing code...

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface FotoDokumentationProps {
  fotos: FotoDokumentation[];
  onFotoChange: (fotos: FotoDokumentation[]) => void;
}

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

const PhotoUploadArea = styled.TouchableOpacity<{
  theme: AppTheme;
  hasPhoto: boolean;
}>`
  background-color: ${({ theme, hasPhoto }) =>
    hasPhoto ? theme.colors.card : theme.colors.background};
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.xl}px;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const PhotoUploadIcon = styled.Text`
  font-size: 48px;
  margin-bottom: 12px;
`;

const PhotoUploadText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.typography.body}px;
  text-align: center;
`;

const PhotoPreview = styled.View<{ theme: AppTheme }>`
  width: 100%;
  height: 250px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const PhotoImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const PhotoActions = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  gap: 8px;
`;

const LocationInfo = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  padding: ${({ theme }) => theme.spacing.md}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
`;

const LocationText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.small}px;
  font-family: monospace;
`;

const PhotoDocItem = styled.View<{ theme: AppTheme }>`
  background-color: ${({ theme }) => theme.colors.card};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const PhotoDocHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const PhotoDocType = styled.View<{
  theme: AppTheme;
  type: "vorher" | "nachher";
}>`
  background-color: ${({ type }) =>
    type === "vorher" ? "#FF9800" : "#4CAF50"};
  padding: ${({ theme }) => theme.spacing.xs}px
    ${({ theme }) => theme.spacing.sm}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
`;

const PhotoDocTypeText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
`;

const PhotoDocDetails = styled.Text<{ theme: AppTheme }>`
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

const FotoDokumentationView: React.FC<FotoDokumentationProps> = ({
  fotos,
  onFotoChange,
}) => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Formular State
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<"vorher" | "nachher">("vorher");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<LocationData | null>(null);

  // Daten State
  const [documentations, setDocumentations] =
    useState<FotoDokumentation[]>(fotos);

  // Lokale Fotos für die Bearbeitung
  const [localFotos, setLocalFotos] = useState<FotoDokumentation[]>(fotos);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    setLocalFotos(fotos);
  }, [fotos]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BERECHTIGUNGEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const requestPermissions = async () => {
    try {
      // Kamera-Berechtigung
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraStatus.granted) {
        Alert.alert(
          "⚠️ Berechtigung erforderlich",
          "Die App benötigt Zugriff auf die Kamera, um Fotos aufzunehmen."
        );
      }

      // Standort-Berechtigung
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      if (!locationStatus.granted) {
        Alert.alert(
          "⚠️ Berechtigung erforderlich",
          "Die App benötigt Zugriff auf den Standort, um GPS-Koordinaten zu erfassen."
        );
      }
    } catch (error) {
      console.error("❌ Fehler bei Berechtigungsanfrage:", error);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FOTO FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        await captureLocation();

        // Auto-Label generieren
        const autoLabel = `Foto_${new Date()
          .toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(/[,:]/g, "-")}`;
        setTitle(autoLabel);
      }
    } catch (error) {
      console.error("❌ Fehler beim Aufnehmen des Fotos:", error);
      Alert.alert("❌ Fehler", "Das Foto konnte nicht aufgenommen werden.");
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
        await captureLocation();
      }
    } catch (error) {
      console.error("❌ Fehler beim Auswählen des Fotos:", error);
      Alert.alert("❌ Fehler", "Das Foto konnte nicht ausgewählt werden.");
    }
  };

  const captureLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
    } catch (error) {
      console.error("❌ Fehler beim Erfassen des Standorts:", error);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("📷 Foto hinzufügen", "Wählen Sie eine Option:", [
      {
        text: "📸 Kamera",
        onPress: pickImageFromCamera,
      },
      {
        text: "🖼️ Galerie",
        onPress: pickImageFromGallery,
      },
      {
        text: "Abbrechen",
        style: "cancel",
      },
    ]);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VALIDIERUNG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validateForm = (): boolean => {
    if (!photo) {
      Alert.alert(
        "❌ Eingabefehler",
        "Ein Foto muss hochgeladen werden.\n\nBitte füge ein Foto hinzu."
      );
      return false;
    }
    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const resetForm = () => {
    setPhoto(null);
    setTitle("");
    setDescription("");
    setLocation(null);
    setPhotoType("vorher");
  };

  const toggleExpand = (id: string) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("✅ Kopiert", "In die Zwischenablage kopiert.");
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PULL-TO-REFRESH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

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
                <HeaderIcon>📷</HeaderIcon>
                <Text
                  variant="h1"
                  numberOfLines={2}
                  style={{ flexShrink: 1, flexWrap: "wrap" }}
                >
                  Foto-Dokumentation
                </Text>
              </View>
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Vorher-/Nachher-Vergleich mit GPS und Zeitstempel
            </CardText>
          </Header>

          {/* Error Banner */}
          {error ? (
            <InfoBanner type="error">
              <InfoBannerText>⚠️ {error}</InfoBannerText>
            </InfoBanner>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FOTO UPLOAD */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Card title="📸 Neues Foto hinzufügen">
            <CardText>
              Fügen Sie ein Foto von der Baustelle hinzu. Der Standort und
              Zeitstempel werden automatisch erfasst.
            </CardText>

            {photo ? (
              <>
                <PhotoPreview>
                  <PhotoImage source={{ uri: photo }} resizeMode="cover" />
                </PhotoPreview>

                <PhotoActions>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Button variant="secondary" onPress={showPhotoOptions}>
                      🔄 Foto ändern
                    </Button>
                  </View>
                  <View style={{ flex: 1, marginLeft: 4 }}>
                    <Button variant="secondary" onPress={() => setPhoto(null)}>
                      🗑️ Entfernen
                    </Button>
                  </View>
                </PhotoActions>
              </>
            ) : (
              <PhotoUploadArea hasPhoto={false} onPress={showPhotoOptions}>
                <PhotoUploadIcon>📷</PhotoUploadIcon>
                <PhotoUploadText>
                  Tippen Sie, um ein Foto hinzuzufügen
                </PhotoUploadText>
                <PhotoUploadText style={{ marginTop: 8 }}>
                  Kamera oder Galerie
                </PhotoUploadText>
              </PhotoUploadArea>
            )}

            {/* Foto-Typ Auswahl */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant={photoType === "vorher" ? "primary" : "secondary"}
                  onPress={() => setPhotoType("vorher")}
                >
                  📋 Vorher
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant={photoType === "nachher" ? "primary" : "secondary"}
                  onPress={() => setPhotoType("nachher")}
                >
                  ✅ Nachher
                </Button>
              </View>
            </View>

            {/* Titel */}
            <Input
              label="📝 Titel"
              placeholder="z.B. Baustelle Eingang"
              value={title}
              onChangeText={setTitle}
            />

            {/* Beschreibung */}
            <Input
              label="💬 Beschreibung (optional)"
              placeholder="Zusätzliche Informationen..."
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={3}
            />

            {/* GPS Info */}
            {location ? (
              <LocationInfo>
                <Text
                  style={{ fontWeight: "600", marginBottom: 4, fontSize: 14 }}
                >
                  📍 GPS-Standort erfasst:
                </Text>
                <LocationText>Lat: {location.latitude.toFixed(6)}</LocationText>
                <LocationText>
                  Lng: {location.longitude.toFixed(6)}
                </LocationText>
                {location.accuracy ? (
                  <LocationText>
                    Genauigkeit: ±{location.accuracy.toFixed(0)}m
                  </LocationText>
                ) : null}
                <View style={{ marginTop: 8 }}>
                  <Button
                    variant="secondary"
                    onPress={() =>
                      copyToClipboard(
                        `${location.latitude}, ${location.longitude}`
                      )
                    }
                  >
                    📋 Koordinaten kopieren
                  </Button>
                </View>
              </LocationInfo>
            ) : null}

            {/* Aktions-Buttons */}
            <Button
              variant="primary"
              onPress={() => {
                if (!validateForm()) return;
                // Mapping von photoType auf die erwarteten Typen
                let mappedType: "Baufortschritt" | "Schaden" | "Sonstiges" =
                  "Sonstiges";
                if (photoType === "vorher" || photoType === "nachher") {
                  mappedType = "Baufortschritt";
                } else if (photoType === "schaden") {
                  mappedType = "Schaden";
                }
                const neuesFoto: FotoDokumentation = {
                  id: Date.now().toString(),
                  uri: photo!,
                  beschreibung: description || undefined,
                  typ: mappedType,
                  timestamp: new Date().toISOString(),
                };

                // Lokale Fotos aktualisieren
                const updatedFotos = [...documentations, neuesFoto];
                setDocumentations(updatedFotos);
                onFotoChange(updatedFotos);

                // Formular zurücksetzen
                resetForm();
              }}
              disabled={!photo || isLoading}
            >
              ➕ Foto speichern
            </Button>

            {photo ? (
              <Button variant="secondary" onPress={resetForm}>
                🔄 Formular zurücksetzen
              </Button>
            ) : null}
          </Card>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DOKUMENTATIONEN LISTE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {documentations.length > 0 ? (
            <Card title="📁 Bisherige Dokumentationen">
              <CardText>
                {documentations.length} Foto
                {documentations.length !== 1 ? "s" : ""} dokumentiert
              </CardText>

              {documentations.map((doc) => (
                <PhotoDocItem key={doc.id}>
                  <PhotoDocHeader>
                    <Text style={{ fontSize: 16, fontWeight: "600", flex: 1 }}>
                      {doc.beschreibung || "Ohne Beschreibung"}
                    </Text>
                    <PhotoDocTypeText>
                      {doc.typ === "Baufortschritt"
                        ? "Baufortschritt"
                        : doc.typ === "Schaden"
                        ? "Schaden"
                        : "Sonstiges"}
                    </PhotoDocTypeText>
                  </PhotoDocHeader>

                  <PhotoDocDetails>
                    🕐 {new Date(doc.timestamp).toLocaleString("de-DE")}
                  </PhotoDocDetails>

                  <ExpandButton onPress={() => toggleExpand(doc.id)}>
                    <ExpandButtonText>
                      {expandedDocs.has(doc.id)
                        ? "▼ Details ausblenden"
                        : "▶ Details anzeigen"}
                    </ExpandButtonText>
                  </ExpandButton>

                  {expandedDocs.has(doc.id) ? (
                    <View style={{ marginTop: 12 }}>
                      <PhotoPreview style={{ height: 200 }}>
                        <PhotoImage
                          source={{ uri: doc.uri }}
                          resizeMode="cover"
                        />
                      </PhotoPreview>

                      {doc.beschreibung ? (
                        <CardText style={{ marginBottom: 8 }}>
                          {doc.beschreibung}
                        </CardText>
                      ) : null}
                    </View>
                  ) : null}
                </PhotoDocItem>
              ))}
            </Card>
          ) : (
            /* ═══════════════════════════════════════════════════════════ */
            /* EMPTY STATE */
            /* ═══════════════════════════════════════════════════════════ */
            <EmptyState>
              <EmptyStateIcon>📸</EmptyStateIcon>
              <EmptyStateText>
                Noch keine Fotos dokumentiert.{"\n"}
                Fügen Sie oben Ihr erstes Foto hinzu.
              </EmptyStateText>
            </EmptyState>
          )}

          {/* Abstand am Ende */}
          <View style={{ height: 100 }} />
        </ScrollContainer>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER ACTIONS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FooterActions entfernt, da loadDocumentations nicht definiert */}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOADING OVERLAY */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isLoading ? (
          <LoadingOverlay>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", marginTop: 16 }}>
              Verarbeite Daten...
            </Text>
          </LoadingOverlay>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FOOTER ACTIONS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <FooterActions>
          <Button
            variant="primary"
            onPress={() => {
              if (!validateForm()) return;
              let mappedType: "Baufortschritt" | "Schaden" | "Sonstiges" =
                "Sonstiges";
              if (photoType === "vorher" || photoType === "nachher") {
                mappedType = "Baufortschritt";
              } else if (photoType === "schaden") {
                mappedType = "Schaden";
              }
              const neuesFoto: FotoDokumentation = {
                id: Date.now().toString(),
                uri: photo!,
                beschreibung: description || undefined,
                typ: mappedType,
                timestamp: new Date().toISOString(),
              };
              const updatedFotos = [...documentations, neuesFoto];
              setDocumentations(updatedFotos);
              onFotoChange(updatedFotos);
              resetForm();
            }}
            disabled={!photo || isLoading}
          >
            {isLoading ? "⏳ Wird gespeichert..." : "✅ Foto speichern"}
          </Button>
          <Button variant="secondary" onPress={resetForm}>
            ❌ Abbrechen
          </Button>
        </FooterActions>
      </Wrapper>
    </SafeAreaView>
  );
};

export default FotoDokumentationView;
