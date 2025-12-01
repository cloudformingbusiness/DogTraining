import React, { useState } from "react";
import { Alert, View } from "react-native";
import styled from "styled-components/native";
import { Button, Card, CardText, Switch, Text } from "../components";
import type { AppTheme } from "../themes";

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

const ScrollContainer = styled.ScrollView`
  flex: 1;
`;

const SettingsScreen = ({ onLogout }) => {
  // States
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [appVersion] = useState("1.0.0");
  const [buildNumber] = useState("100");

  // Helper functions
  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    if (!value) {
      setPushNotifications(false);
      setEmailNotifications(false);
    }
  };

  const handlePushNotificationsToggle = (value) => {
    if (notificationsEnabled) {
      setPushNotifications(value);
    } else {
      Alert.alert(
        "Aktivieren Sie zuerst die Benachrichtigungen, um diese Einstellung zu ändern."
      );
    }
  };

  const handleEmailNotificationsToggle = (value) => {
    if (notificationsEnabled) {
      setEmailNotifications(value);
    } else {
      Alert.alert(
        "Aktivieren Sie zuerst die Benachrichtigungen, um diese Einstellung zu ändern."
      );
    }
  };

  const toggleTheme = () => {
    Alert.alert(
      "Theme-Wechsel",
      "Diese Funktion ist noch nicht implementiert."
    );
  };

  return (
    <Wrapper>
      <ScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Header>
          <HeaderTitle>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <HeaderIcon>⚙️</HeaderIcon>
              <Text
                variant="h1"
                numberOfLines={2}
                style={{ flexShrink: 1, flexWrap: "wrap" }}
              >
                Einstellungen
              </Text>
            </View>
          </HeaderTitle>
          <CardText style={{ marginTop: 8, opacity: 0.8 }}>
            Persönliche Einstellungen und App-Konfiguration
          </CardText>
        </Header>
        <View style={{ padding: 16 }}>
          {/* Benachrichtigungen */}
          <Card title="🔔 Benachrichtigungen">
            <CardText style={{ marginBottom: 16 }}>
              Verwalten Sie Ihre Benachrichtigungseinstellungen und bestimmen
              Sie, wie Sie über wichtige Ereignisse informiert werden möchten.
            </CardText>
            <Switch
              label="📱 Benachrichtigungen aktivieren"
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
            />
            {notificationsEnabled && (
              <View style={{ marginTop: 12 }}>
                <CardText
                  style={{ marginBottom: 12, opacity: 0.8, fontSize: 12 }}
                >
                  💡 Wählen Sie aus, welche Arten von Benachrichtigungen Sie
                  erhalten möchten:
                </CardText>
                <Switch
                  label="🔔 Push-Benachrichtigungen"
                  value={pushNotifications}
                  onValueChange={handlePushNotificationsToggle}
                />
                <Switch
                  label="📧 E-Mail-Benachrichtigungen"
                  value={emailNotifications}
                  onValueChange={handleEmailNotificationsToggle}
                />
                <CardText style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                  ℹ️ Push-Benachrichtigungen erscheinen direkt auf Ihrem Gerät.
                  E-Mail-Benachrichtigungen werden an Ihre hinterlegte
                  E-Mail-Adresse gesendet.
                </CardText>
              </View>
            )}
            <Button
              variant="secondary"
              onPress={() => {
                Alert.alert(
                  "🔔 Benachrichtigungseinstellungen",
                  `Status:\n\n` +
                    `📱 Benachrichtigungen: ${
                      notificationsEnabled ? "✅ Aktiviert" : "❌ Deaktiviert"
                    }\n` +
                    `🔔 Push: ${
                      pushNotifications ? "✅ Aktiviert" : "❌ Deaktiviert"
                    }\n` +
                    `📧 E-Mail: ${
                      emailNotifications ? "✅ Aktiviert" : "❌ Deaktiviert"
                    }\n\n` +
                    `💡 Tipp: Aktivieren Sie Benachrichtigungen, um keine wichtigen Updates zu verpassen.`,
                  [{ text: "OK" }]
                );
              }}
            >
              <Text>📊 Status anzeigen</Text>
            </Button>
          </Card>

          {/* Theme Einstellungen */}
          <Card title="🎨 Theme Einstellungen">
            <CardText>Hier können Sie das Aussehen der App anpassen.</CardText>
            <Button variant="primary" onPress={toggleTheme}>
              <Text>Theme wechseln</Text>
            </Button>
          </Card>

          {/* Über BauLogPro */}
          <View style={{ marginBottom: 50, marginTop: 24 }}>
            <Card title="📱 Über BauLogPro">
              <CardText style={{ marginBottom: 12 }}>
                Willkommen bei BauLogPro v{appVersion} - Ihrer professionellen
                Plattform für Baustellenmanagement, Messdatenerfassung und
                Projektdokumentation.
              </CardText>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                🚀 App-Features:
              </Text>
              <CardText style={{ fontSize: 12, marginBottom: 8 }}>
                • 📊 Dashboard - Projektübersicht und Verwaltung{"\n"}• 📁
                Projekt Detail - Zentrale Projektverwaltung mit GPS{"\n"}• 📏
                Messdaten - Präzise Erfassung von Länge, Breite, Tiefe{"\n"}• 📸
                Foto-Dokumentation - Vorher/Nachher mit Zeitstempel{"\n"}• 🛡️
                Sicherheitsmaßnahmen - Dokumentation und Status{"\n"}• 💰
                Kalkulation - Kostenvoranschläge und Berichte{"\n"}• 📄
                PDF-Export - Vollständiger Projektbericht{"\n"}• ⚙️
                Einstellungen - Konfiguration und Profile
              </CardText>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                🔧 Technische Details:
              </Text>
              <CardText style={{ fontSize: 12, marginBottom: 12 }}>
                Version: {appVersion}
                {"\n"}
                Build: {buildNumber}
                {"\n"}
                Framework: React Native + Expo{"\n"}
                Entwickler: Cloudforming Business{"\n"}© 2025 Alle Rechte
                vorbehalten
              </CardText>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Button
                  variant="secondary"
                  onPress={() => {
                    Alert.alert(
                      "🔄 Changelog v" + appVersion,
                      `Was ist neu in Version ${appVersion}?\n\n` +
                        `✨ Neue Features:\n` +
                        `• ➕ Neues Projekt direkt im Dashboard anlegen\n` +
                        `• 📦 Zentrale Projektverwaltung mit einheitlichem Datenformat\n` +
                        `• 🤖 Automatische Projekt-Erstellung beim ersten Speichern\n` +
                        `• 📄 Vollständiger PDF-Export mit allen Daten\n` +
                        `• 🎯 Verbesserte Projekt-Auswahl und -Verwaltung\n\n` +
                        `🛠️ Verbesserungen:\n` +
                        `• 💾 Alle Daten eines Projekts zentral unter einem Key gespeichert\n` +
                        `• 📋 Zweizeiliger Umbruch für lange Überschriften\n` +
                        `• 🎨 Optimierte Benutzeroberfläche\n` +
                        `• ⚡ Bessere Performance bei Datenverwaltung`,
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Text>🔄 Changelog</Text>
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => {
                    Alert.alert(
                      "⚖️ Lizenz & Datenschutz",
                      `BUDashboard App - Lizenzinformationen\n\n` +
                        `📄 Software-Lizenz:\n` +
                        `Proprietäre Software\n` +
                        `© 2025 Cloudforming Business\n` +
                        `Alle Rechte vorbehalten\n\n` +
                        `🔒 Datenschutz:\n` +
                        `• Alle Daten werden lokal gespeichert\n` +
                        `• Keine automatische Cloud-Synchronisation\n` +
                        `• Webhook-Daten nur bei explizitem Aufruf\n` +
                        `• Konfigurationen bleiben auf dem Gerät`,
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Text>⚖️ Lizenz & Datenschutz</Text>
                </Button>
              </View>
            </Card>
          </View>
        </View>
      </ScrollContainer>
      {/* Logout-Bereich fixiert am unteren Rand, außerhalb des ScrollContainers */}
      {typeof onLogout === "function" && (
        <View
          style={{
            padding: 24,
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
            backgroundColor: "#f7f7f7",
          }}
        >
          <Button variant="danger" onPress={onLogout}>
            <Text>🚪 Abmelden</Text>
          </Button>
        </View>
      )}
    </Wrapper>
  );
};

export default SettingsScreen;
