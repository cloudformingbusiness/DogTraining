// src/views/LoginView.tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 LOGIN VIEW - BauLogPro
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zweck: Schneller und unkomplizierter Zugang zur App über Login
 *
 * Beschreibung:
 * Eine klar strukturierte und intuitive Login-Ansicht für die Authentifizierung
 * von Nutzern. Bietet einfache Navigation, Fehlerbehandlung und visuelles
 * Feedback bei erfolgreicher oder fehlgeschlagener Anmeldung.
 *
 * Features:
 * - E-Mail/Benutzername und Passwort-Eingabe
 * - Formularvalidierung
 * - "Eingeloggt bleiben" Checkbox
 * - "Passwort vergessen?" Link
 * - Offline-Entwürfe (AsyncStorage)
 * - Clipboard-Unterstützung
 * - Barrierefreie Gestaltung
 *
 * Zielgruppe: App-Nutzer mit Zugang zu geschützten Bereichen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  View,
} from "react-native";
import styled from "styled-components/native";
import { Button, Card, CardText, Checkbox, Input, Text } from "../components";
import type { AppTheme } from "../themes";

// ═══════════════════════════════════════════════════════════════════════════
// TYPEN & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface LoginCredentials {
  emailUsername: string;
  password: string;
  rememberMe: boolean;
}

interface ApiResponse {
  status: "success" | "error";
  message?: string;
  userId?: string;
}

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// API KONSTANTEN
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE_URL = "https://api.cloudforming.de/api";
//  process.env.NODE_ENV === "development"
//    ? "http://localhost:4000/api"
//    : ;
const LOGIN_URL = `${API_BASE_URL}/login`;
const CREATE_URL = "https://n8n.cloudforming.de/webhook/LoginView-create";
const UPDATE_URL = "https://n8n.cloudforming.de/webhook/LoginView-update";
const LIST_URL = "https://n8n.cloudforming.de/webhook/LoginView-list";
const DELETE_URL = "https://n8n.cloudforming.de/webhook/LoginView-delete";
const HOOK_SECRET = "MY_SUPER_SECRET";

// ═══════════════════════════════════════════════════════════════════════════
// ASYNCSTORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  credentials: "@LoginView:credentials",
  rememberMe: "@LoginView:rememberMe",
  draft: "@LoginView:draft",
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

const LogoSection = styled.View<{ theme: AppTheme }>`
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg}px;
  padding-top: ${({ theme }) => theme.spacing.md}px;
`;

const LogoIcon = styled.Text`
  font-size: 72px;
  margin-bottom: ${({ theme }) => theme.spacing.sm}px;
`;

const CompanyName = styled.Text<{ theme: AppTheme }>`
  font-size: ${({ theme }) => theme.typography.h1}px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
`;

const CompanyTagline = styled.Text<{ theme: AppTheme }>`
  font-size: ${({ theme }) => theme.typography.body}px;
  color: ${({ theme }) => theme.colors.muted};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.xs}px;
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

const LinkButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  padding: ${({ theme }) => theme.spacing.sm}px;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.sm}px;
`;

const LinkText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.body}px;
  text-decoration: underline;
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

// ═══════════════════════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export default function LoginView({ onLoginSuccess }: LoginViewProps = {}) {
  // DEV/PROD-Modus aus AsyncStorage
  const [devLoginEnabled, setDevLoginEnabled] = useState<boolean>(true); // Standard: DEV-MODE aktiv
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      let val = await AsyncStorage.getItem("devLoginEnabled");
      if (val === null) {
        // Standardmäßig DEV-MODE aktiv setzen, falls kein Wert vorhanden
        await AsyncStorage.setItem("devLoginEnabled", "true");
        val = "true";
        console.log("[Login] devLoginEnabled nicht gefunden, auf true gesetzt");
      } else {
        console.log("[Login] devLoginEnabled gelesen:", val);
      }
      setDevLoginEnabled(val === "true");
      setInitialized(true);
    })();
    // ...existing code...
  }, []);

  // State für Registrierungs-Dialog
  const [registerEmail, setRegisterEmail] = useState<string>("");
  const [registerPassword, setRegisterPassword] = useState<string>("");
  const [registerName, setRegisterName] = useState<string>("");
  const [showRegisterDialog, setShowRegisterDialog] = useState<boolean>(false);
  // State für Passwort-vergessen-Dialog
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [showForgotDialog, setShowForgotDialog] = useState<boolean>(false);
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Formular State
  const [emailUsername, setEmailUsername] =
    useState<string>("test@baulogpro.de");
  const [password, setPassword] = useState<string>("test123");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LIFECYCLE & EFFECTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    loadStoredCredentials();
    loadDraft();
  }, []);

  // Auto-Save Draft
  useEffect(() => {
    const saveDraft = async () => {
      if (emailUsername || password) {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.draft,
            JSON.stringify({ emailUsername, password })
          );
        } catch (error) {
          console.error("❌ Fehler beim Speichern des Entwurfs:", error);
        }
      }
    };

    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [emailUsername, password]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ASYNCSTORAGE FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const loadStoredCredentials = async () => {
    try {
      const [storedCredentials, storedRememberMe] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.credentials),
        AsyncStorage.getItem(STORAGE_KEYS.rememberMe),
      ]);

      if (storedRememberMe === "true" && storedCredentials) {
        const credentials: LoginCredentials = JSON.parse(storedCredentials);
        setEmailUsername(credentials.emailUsername);
        setPassword(credentials.password);
        setRememberMe(true);
      }
    } catch (error) {
      console.error(
        "❌ Fehler beim Laden der gespeicherten Anmeldedaten:",
        error
      );
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEYS.draft);
      if (draft) {
        const { emailUsername: draftEmail, password: draftPassword } =
          JSON.parse(draft);
        if (!emailUsername && draftEmail) setEmailUsername(draftEmail);
        if (!password && draftPassword) setPassword(draftPassword);
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden des Entwurfs:", error);
    }
  };

  const saveCredentials = async () => {
    try {
      const credentials: LoginCredentials = {
        emailUsername,
        password,
        rememberMe,
      };

      if (rememberMe) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.credentials,
          JSON.stringify(credentials)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.rememberMe, "true");
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.credentials);
        await AsyncStorage.removeItem(STORAGE_KEYS.rememberMe);
      }
    } catch (error) {
      console.error("❌ Fehler beim Speichern der Anmeldedaten:", error);
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

    if (!emailUsername.trim()) {
      setError("Bitte eine gültige E-Mail-Adresse oder Benutzername eingeben.");
      return false;
    }

    if (!password.trim()) {
      setError("Bitte ein Passwort eingeben.");
      return false;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return false;
    }

    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // ECHTER API-AUFRUF zum Express-Server
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: emailUsername.trim(),
          password: password,
        }),
      }).catch((fetchError) => {
        throw new Error("Überprüfen Sie Ihre Internetverbindung.");
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.token) {
        throw new Error(result.message || "Ungültige Anmeldedaten.");
      }

      setSuccessMessage(result.message || "Login erfolgreich!");
      await saveCredentials();
      await clearDraft();

      if (!rememberMe) {
        setEmailUsername("");
        setPassword("");
      }

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      setTimeout(() => {
        Alert.alert("✅ Erfolg", result.message || "Login erfolgreich!");
      }, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
      setError(errorMessage);
      console.error("❌ Login-Fehler:", error);
      Alert.alert("❌ Fehler", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Login überspringen im Entwicklungsmodus
  const skipLogin = async () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    Alert.alert("Entwicklung", "Login wurde übersprungen.");
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUTTON AKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleForgotPassword = () => {
    setShowForgotDialog(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      Alert.alert("Fehler", "Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    try {
      console.log("Sende Passwort-vergessen-Request für:", forgotEmail);
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      console.log("Response Status:", response.status);
      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        console.log("Erfolgs-Response:", result);
        Alert.alert(
          "✅ Erfolgreich",
          result.message ||
            "Eine E-Mail zum Zurücksetzen des Passworts wurde versendet."
        );
        setShowForgotDialog(false);
        setForgotEmail("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("Fehler-Response:", errorData);
        Alert.alert(
          "Fehler",
          errorData.error ||
            JSON.stringify(errorData) ||
            `Konnte keine E-Mail versenden. (Status: ${response.status})`
        );
      }
    } catch (error) {
      console.log("Netzwerkfehler oder Exception:", error);
      Alert.alert("Fehler", "Netzwerkfehler oder Server nicht erreichbar.");
    }
  };

  const handleRegister = () => {
    setShowRegisterDialog(true);
  };

  const handleRegisterSubmit = async () => {
    if (!registerEmail.trim() || !registerEmail.includes("@")) {
      Alert.alert("Fehler", "Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (!registerPassword.trim() || registerPassword.length < 6) {
      Alert.alert(
        "Fehler",
        "Das Passwort muss mindestens 6 Zeichen lang sein."
      );
      return;
    }
    if (!registerName.trim()) {
      Alert.alert("Fehler", "Bitte einen Namen eingeben.");
      return;
    }
    try {
      // Beispiel-Endpoint, anpassen nach Backend
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail.trim(),
          password: registerPassword,
          name: registerName.trim(),
        }),
      });
      if (response.ok) {
        Alert.alert(
          "✅ Erfolgreich",
          "Das Konto wurde erstellt. Sie können sich jetzt anmelden."
        );
        setShowRegisterDialog(false);
        setRegisterEmail("");
        setRegisterPassword("");
        setRegisterName("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          "Fehler",
          errorData.error || "Konnte kein Konto erstellen."
        );
      }
    } catch (error) {
      Alert.alert("Fehler", "Netzwerkfehler oder Server nicht erreichbar.");
    }
  };

  const handleCopyCredentials = () => {
    const credentialsText = `Benutzername: ${emailUsername}\nPasswort: ${"*".repeat(
      password.length
    )}`;
    Clipboard.setString(credentialsText);
    Alert.alert(
      "✅ Kopiert",
      "Anmeldedaten wurden in die Zwischenablage kopiert."
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNKTIONEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const isFormValid =
    emailUsername.trim().length > 0 && password.trim().length > 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Wrapper>
          {/* Entwicklungs-Schalter für Login wurde entfernt. Steuerung nur im Screen 'Entwicklungen'. */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* HEADER */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Header>
            {/* Logo und Firmenname */}
            <LogoSection>
              <LogoIcon>🏗️</LogoIcon>
              <CompanyName>BauLogPro</CompanyName>
              <CompanyTagline>Professionelle Baudokumentation</CompanyTagline>
            </LogoSection>

            {/* Anmelde-Titel und Dev-Mode-Badge */}
            <HeaderTitle>
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <HeaderIcon>🔐</HeaderIcon>
                <Text variant="h1">Anmelden</Text>
              </View>
              {devLoginEnabled && initialized && (
                <View style={{ position: "absolute", right: 0, top: 0 }}>
                  <Text
                    style={{
                      backgroundColor: "#388E3C",
                      color: "#fff",
                      fontWeight: "bold",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      fontSize: 13,
                      marginRight: 4,
                    }}
                  >
                    DEV-MODE
                  </Text>
                </View>
              )}
            </HeaderTitle>
            <CardText style={{ marginTop: 8, opacity: 0.8 }}>
              Melden Sie sich an, um auf Ihre Projekte zuzugreifen
            </CardText>
          </Header>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CONTENT */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <ScrollContainer
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* LOGIN FORMULAR */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <Card title="📝 Anmeldeinformationen">
              {error ? (
                <InfoBanner type="error">
                  <InfoBannerText>{error}</InfoBannerText>
                </InfoBanner>
              ) : null}
              <CardText>Bitte geben Sie Ihre Zugangsdaten ein</CardText>

              <FormSection>
                <Input
                  label="📧 E-Mail oder Benutzername"
                  placeholder="E-Mail oder Benutzername eingeben"
                  value={emailUsername}
                  onChangeText={setEmailUsername}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="🔒 Passwort"
                      placeholder="Passwort eingeben"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ marginLeft: 8 }}>
                    <Button
                      variant="secondary"
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "🙈 Verbergen" : "👁️ Anzeigen"}
                    </Button>
                  </View>
                </View>

                <Checkbox
                  label="Eingeloggt bleiben"
                  checked={rememberMe}
                  onToggle={() => setRememberMe(!rememberMe)}
                />

                <LinkButton onPress={handleForgotPassword}>
                  <LinkText>🔑 Passwort vergessen?</LinkText>
                </LinkButton>
              </FormSection>
            </Card>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ZUSÄTZLICHE AKTIONEN */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <Card title="ℹ️ Informationen">
              <CardText>
                Noch kein Konto? Sie können sich registrieren oder bei Problemen
                den Support kontaktieren.
              </CardText>

              <Button variant="secondary" onPress={handleRegister}>
                📝 Neues Konto erstellen
              </Button>

              {isFormValid ? (
                <Button variant="secondary" onPress={handleCopyCredentials}>
                  📋 Anmeldedaten kopieren
                </Button>
              ) : null}
            </Card>

            {/* Registrierungs-Dialog als Modal-Overlay */}
            {showRegisterDialog ? (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  zIndex: 999,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    padding: 24,
                    borderRadius: 12,
                    width: "80%",
                  }}
                >
                  <Text variant="h2" style={{ marginBottom: 12 }}>
                    📝 Konto erstellen
                  </Text>
                  <Input
                    label="Name"
                    placeholder="Ihr Name"
                    value={registerName}
                    onChangeText={setRegisterName}
                  />
                  <Input
                    label="E-Mail-Adresse"
                    placeholder="E-Mail eingeben"
                    value={registerEmail}
                    onChangeText={setRegisterEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Input
                    label="Passwort"
                    placeholder="Passwort eingeben"
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                    secureTextEntry={true}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 16,
                    }}
                  >
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setShowRegisterDialog(false);
                        setRegisterEmail("");
                        setRegisterPassword("");
                        setRegisterName("");
                      }}
                    >
                      Abbrechen
                    </Button>
                    <View style={{ width: 12 }} />
                    <Button variant="primary" onPress={handleRegisterSubmit}>
                      Absenden
                    </Button>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Abstand am Ende */}
            <View style={{ height: 100 }} />
          </ScrollContainer>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FOOTER ACTIONS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <FooterActions>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                variant="secondary"
                onPress={skipLogin}
                disabled={isLoading}
              >
                ⏭️ Überspringen
              </Button>
              <Button
                variant="primary"
                onPress={handleLogin}
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? "⏳ Wird angemeldet..." : "🔒 Login"}
              </Button>
            </View>
          </FooterActions>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* LOADING OVERLAY */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {isLoading ? (
            <LoadingOverlay>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", marginTop: 16 }}>
                Anmeldung läuft...
              </Text>
            </LoadingOverlay>
          ) : null}
        </Wrapper>
        {/* Passwort vergessen Dialog als Modal-Overlay */}
        {showForgotDialog ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 999,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 12,
                width: "80%",
              }}
            >
              <Text variant="h2" style={{ marginBottom: 12 }}>
                🔑 Passwort zurücksetzen
              </Text>
              <Input
                label="E-Mail-Adresse"
                placeholder="E-Mail eingeben"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <Button
                  variant="secondary"
                  onPress={() => {
                    setShowForgotDialog(false);
                    setForgotEmail("");
                  }}
                >
                  Abbrechen
                </Button>
                <View style={{ width: 12 }} />
                <Button variant="primary" onPress={handleForgotSubmit}>
                  Absenden
                </Button>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
